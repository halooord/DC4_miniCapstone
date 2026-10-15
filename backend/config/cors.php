<?php

return [

    // Only the API needs CORS (the React app runs on a different port than Laravel).
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    // The React (Vite) dev server. Add your deployed frontend URL here if you ever deploy.
    'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // We use Bearer tokens, not cookies, so credentials are not needed.
    'supports_credentials' => false,

];