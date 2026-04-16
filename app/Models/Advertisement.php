<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Advertisement extends Model
{
    protected $table = 'advertisement';

    public $timestamps = false;

    protected $fillable = [
        'title',
        'brand',
        'model',
        'img_url',
        'ad_url',
        'contactperson_name',
        'company_name',
        'mobile',
        'email',
        'ad_type',
        'category_id',
        'annual_rates',
        'start_date',
        'end_date',
        'status',
        'addeddate',
        'addedby',
        'modifieddate',
        'modifiedby',
    ];

    protected function casts(): array
    {
        return [
            'mobile' => 'string',
            'ad_type' => 'integer',
            'category_id' => 'integer',
            'annual_rates' => 'string',
            'status' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }
}
