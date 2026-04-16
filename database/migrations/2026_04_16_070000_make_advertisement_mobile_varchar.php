<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('advertisement')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            $modeRow = DB::selectOne('SELECT @@SESSION.sql_mode AS mode');
            $prevMode = is_object($modeRow) && isset($modeRow->mode) ? (string) $modeRow->mode : '';
            DB::statement("SET SESSION sql_mode = REPLACE(REPLACE(REPLACE(REPLACE(@@SESSION.sql_mode,'NO_ZERO_DATE',''),'NO_ZERO_IN_DATE',''),'STRICT_TRANS_TABLES',''),'STRICT_ALL_TABLES','')");

            // Legacy dumps may contain zero-dates that block ALTER TABLE in strict mode.
            foreach (['addeddate', 'modifieddate', 'start_date', 'end_date'] as $col) {
                if (Schema::hasColumn('advertisement', $col)) {
                    DB::statement("UPDATE `advertisement` SET `{$col}` = '1970-01-01' WHERE `{$col}` IN ('0000-00-00', '0000-00-00 00:00:00')");
                }
            }
            DB::statement('ALTER TABLE `advertisement` MODIFY `mobile` VARCHAR(20) NULL');
            DB::statement('SET SESSION sql_mode = '.$this->quoteSqlString($prevMode));
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE "advertisement" ALTER COLUMN "mobile" TYPE VARCHAR(20)');
            DB::statement('ALTER TABLE "advertisement" ALTER COLUMN "mobile" DROP NOT NULL');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('advertisement')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `advertisement` MODIFY `mobile` INT NULL');
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE "advertisement" ALTER COLUMN "mobile" TYPE INTEGER USING NULLIF(regexp_replace("mobile", \'\\D\', \'\', \'g\'), \'\')::INTEGER');
        }
    }

    private function quoteSqlString(string $value): string
    {
        return "'".str_replace("'", "''", $value)."'";
    }
};
