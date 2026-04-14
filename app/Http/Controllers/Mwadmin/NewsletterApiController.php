<?php

namespace App\Http\Controllers\Mwadmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Mwadmin\Concerns\AuthorizesMwadminPermissions;
use App\Models\Newsletter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class NewsletterApiController extends Controller
{
    use AuthorizesMwadminPermissions;

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newsletter', 'allow_view')) {
            return $deny;
        }

        $perPageParam = (string) $request->query('per_page', '10');
        $allRows = strtolower($perPageParam) === 'all';
        $perPage = $allRows ? 100000 : max(1, min((int) $perPageParam, 100));
        $search = trim((string) $request->query('search', ''));
        $filterEmail = trim((string) $request->query('filter_email', ''));
        $filterStatus = trim((string) $request->query('filter_status', ''));

        $query = Newsletter::query()->select('id', 'email', 'status');

        if ($search !== '') {
            $query->where('email', 'like', "%{$search}%");
        }
        if ($filterEmail !== '') {
            $query->where('email', 'like', "%{$filterEmail}%");
        }
        if ($filterStatus !== '') {
            $query->where('status', $filterStatus === 'Active' ? 1 : 0);
        }

        $paginator = $query->orderByDesc('id')->paginate($perPage)->withQueryString();
        $collection = collect($paginator->items())->map(fn ($item) => [
            'id' => $item->id,
            'email' => $item->email,
            'status' => (int) $item->status,
        ])->values();

        return response()->json([
            'data' => $collection,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newsletter', 'allow_delete')) {
            return $deny;
        }

        Newsletter::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Email Id deleted successfully.']);
    }

    /**
     * Export as .xls (HTML table) for Excel, matching legacy NewsletterExports.xls.
     * With specific ids: export those rows. Without ids: export all active (status = 1), like legacy.
     */
    public function export(Request $request): Response
    {
        if ($deny = $this->mwadminDenyUnless($request, 'newsletter', 'allow_export')) {
            return $deny;
        }

        $validated = $request->validate([
            'ids' => ['nullable', 'array'],
            'ids.*' => ['integer', 'min:1'],
        ]);

        $ids = $validated['ids'] ?? null;
        $query = Newsletter::query()->select('id', 'email', 'status')->orderBy('id');
        if (is_array($ids) && count($ids) > 0) {
            $query->whereIn('id', $ids);
        } else {
            $query->where('status', 1);
        }

        $rows = $query->get();

        $filename = 'NewsletterExports.xls';

        return response()->streamDownload(function () use ($rows): void {
            echo '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1">';
            echo '<tr><th>Email</th><th>Status</th></tr>';
            foreach ($rows as $row) {
                $email = htmlspecialchars((string) $row->email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
                $statusLabel = (int) $row->status === 1 ? 'Active' : 'In-Active';
                echo '<tr><td>'.$email.'</td><td>'.htmlspecialchars($statusLabel, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'</td></tr>';
            }
            echo '</table></body></html>';
        }, $filename, [
            'Content-Type' => 'application/vnd.ms-excel',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
