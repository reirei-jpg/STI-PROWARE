<?php

return [
    /*
    |--------------------------------------------------------------------------
    | College Programs
    |--------------------------------------------------------------------------
    |
    | These programs are shown only when a product uses the
    | program_and_size tracking mode.
    |
    */

    'programs' => [
        [
            'value' => 'BSIT',
            'label' => 'BS Information Technology',
        ],
        [
            'value' => 'BSTM',
            'label' => 'BS Tourism Management',
        ],
        [
            'value' => 'BSHM',
            'label' => 'BS Hospitality Management',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Product Sizes
    |--------------------------------------------------------------------------
    |
    | "value" is stored in product_variants.size.
    | "code" becomes part of the SKU and variant key.
    |
    */

    'sizes' => [
        [
            'value' => 'Extra Small',
            'label' => 'Extra Small',
            'code' => 'XS',
        ],
        [
            'value' => 'Small',
            'label' => 'Small',
            'code' => 'S',
        ],
        [
            'value' => 'Medium',
            'label' => 'Medium',
            'code' => 'M',
        ],
        [
            'value' => 'Large',
            'label' => 'Large',
            'code' => 'L',
        ],
        [
            'value' => 'Extra Large',
            'label' => 'Extra Large',
            'code' => 'XL',
        ],
        [
            'value' => '2XL',
            'label' => '2XL',
            'code' => '2XL',
        ],
        [
            'value' => '3XL',
            'label' => '3XL',
            'code' => '3XL',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Reorder Level
    |--------------------------------------------------------------------------
    */

    'default_reorder_level' => 5,
];
