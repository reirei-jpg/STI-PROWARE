<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use Illuminate\Support\Facades\DB;

class PurchaseOrderNumberGenerator
{
    public function generate(): string
    {
        return DB::transaction(
            function (): string {
                $date =
                    now()->format(
                        'Ymd',
                    );

                $prefix =
                    "PO-{$date}-";

                $latest =
                    PurchaseOrder::query()
                        ->where(
                            'po_number',
                            'like',
                            $prefix.'%',
                        )
                        ->lockForUpdate()
                        ->orderByDesc(
                            'id',
                        )
                        ->first();

                $nextSequence =
                    1;

                if ($latest) {
                    $lastSequence =
                        (int)
                        substr(
                            $latest
                                ->po_number,
                            -6,
                        );

                    $nextSequence =
                        $lastSequence
                        + 1;
                }

                return $prefix
                    .str_pad(
                        (string)
                        $nextSequence,
                        6,
                        '0',
                        STR_PAD_LEFT,
                    );
            },
        );
    }
}
