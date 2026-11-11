export interface paths {
    "/api/v1/attestation/challenge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request an attestation challenge
         * @description Issues a one-time, five-minute challenge bound to the authenticated key. Android has the device keystore attest to it and iOS signs it with App Attest; either way the evidence goes in the identify request, and a report that does not carry one of these challenges is never treated as proven.
         */
        post: operations["requestAttestationChallenge"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List events
         * @description Identification events from the secret key's own organization and environment, newest first, in a window of at most 30 days that starts at most 30 days ago. There is no total count: a page with fewer rows than `page_size` is the last.
         */
        get: operations["listEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events/{request_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get an event
         * @description One identification event by its request ID, from the secret key's own organization and environment. Read it on your server to verify what a client reported before you act on it. An event is normally readable within a few seconds of the identification.
         */
        get: operations["getEvent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events/{request_id}/supplement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit a deferred report
         * @description Attaches the signals a browser collects after its initial budget to an identification that has already been answered. It never changes the visitor, the score, billing or webhooks. The JavaScript SDK sends it automatically. Resending the same report is answered as a duplicate.
         */
        post: operations["submitDeferredReport"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/identify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Identify a visitor
         * @description Submits the signal report a client SDK collected and answers with the request ID, the visitor ID and its confidence. There is no second call to make.
         *
         *     A browser, an app, a proxy and a hosted domain also receive `suspect_score` and `suspect_level`, unless the key withholds them, and never `triggers`. A secret key called directly from a backend receives the score, the level and the `triggers`.
         *
         *     The client SDKs build and send this request. `signals` is produced by them and is not a public contract. Send an `Idempotency-Key` header, and the same value on every retry, so a retried identification is answered and charged once.
         *
         *     The `X-Request-Id` response header names this HTTP exchange, for support and logs. It is not the `request_id` in the body, which names the identification and is what `GET /events/{request_id}` reads.
         */
        post: operations["identifyVisitor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/ingest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Submit from a client SDK
         * @description The one URL the client SDKs and every first-party proxy post to. A body with a `token` is a deferred report and is answered `202` with `request_id` and `duplicate`, exactly as the deferred report route answers. Any other body is an identification and is answered `200` exactly as the identify route answers.
         *
         *     It exists so a proxy can forward everything it receives to a single path, and so the SDK can post both calls to one path of the customer's choosing, with nothing appended that a content blocker could match across sites.
         *
         *     The `X-Request-Id` response header names this HTTP exchange, for support and logs. It is not the `request_id` in the body, which names the identification and is what `GET /events/{request_id}` reads.
         */
        post: operations["submitFromClientSdk"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/key": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Describe the management key
         * @description The organization and role of the key the request was made with. Every other management route names the organization in its path; read it here.
         */
        get: operations["describeManagementKey"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/hosted-domains": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List hosted domains
         * @description `available` says whether hosted domains can be added on this deployment, and `target` is what each one's CNAME points at.
         */
        get: operations["listHostedDomains"];
        put?: never;
        /**
         * Add a hosted domain
         * @description Registers a subdomain of your site for Fingerly to serve the browser SDK on, and asks for its certificate. It becomes `active` once your CNAME to `target` resolves and the certificate is issued. Omit `path` for a random one.
         */
        post: operations["addHostedDomain"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/hosted-domains/{hosted_domain_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remove a hosted domain */
        delete: operations["removeHostedDomain"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/hosted-domains/{hosted_domain_id}/check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Check a hosted domain now */
        post: operations["checkHostedDomainNow"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/proxy-credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List proxy keys */
        get: operations["listProxyKeys"];
        put?: never;
        /**
         * Issue a proxy key
         * @description The response carries `secret` in full, once.
         */
        post: operations["issueProxyKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/proxy-credentials/{proxy_credential_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update a proxy key
         * @description Changes the name, the kind, or the path the browser SDK posts to. The key itself is unchanged. Omit `path` for a new random one.
         */
        patch: operations["updateProxyKey"];
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/proxy-credentials/{proxy_credential_id}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Revoke a proxy key */
        post: operations["revokeProxyKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/risk-weights": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read the organization's risk weights
         * @description One profile per platform, with the shipped defaults beside it. Every key without a profile of its own is scored under these.
         */
        get: operations["readOrganizationRiskWeights"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/risk-weights/{platform}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Save the organization's risk weights for a platform
         * @description Every field is optional. Send the `revision` a read returned to be refused with 409 if someone saved in between. Applies to the next identification.
         */
        put: operations["saveOrganizationRiskWeightsPlatform"];
        post?: never;
        /** Restore the default risk weights for a platform */
        delete: operations["restoreDefaultRiskWeightsPlatform"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/sdk-keys": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List SDK keys
         * @description Every public and secret key the organization holds, in every environment, revoked keys included. Secrets are never returned after issue.
         */
        get: operations["listSdkKeys"];
        put?: never;
        /**
         * Issue an SDK key
         * @description `kind` is public or secret, and `environment` is production, staging or development. A public key needs at least one allowed origin; a secret key may have none. The response carries `secret` in full, once.
         */
        post: operations["issueSdkKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/sdk-keys/{sdk_key_id}/apps": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace the native apps a public key may be used from
         * @description Replaces each list: Android package names, SHA-256 signing certificate digests in hex, and Apple app IDs (Team ID, a dot, the bundle identifier). An empty list means not configured.
         */
        put: operations["replaceNativeAppsPublicKeyMayBeUsedFrom"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/sdk-keys/{sdk_key_id}/client-response": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set what a key's public callers are told
         * @description With `hide_score` true, a browser, an app, a proxy and a hosted domain using this key get no `suspect_score` and no `suspect_level`; both fields are absent from the answer. The event is still scored and stored, and a secret key called directly, the event read, webhooks and the dashboard still see everything. Takes effect on the next request.
         */
        put: operations["setWhatKeyPublicCallersAreTold"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/sdk-keys/{sdk_key_id}/origins": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace a public key's allowed origins
         * @description Replaces the whole list. An origin is a scheme, a host and an optional port. An empty list refuses every browser request.
         */
        put: operations["replacePublicKeyAllowedOrigins"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/sdk-keys/{sdk_key_id}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Revoke an SDK key
         * @description Refuses the key from the next request on. There is no un-revoke.
         */
        post: operations["revokeSdkKey"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/sdk-keys/{sdk_key_id}/risk-weights": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read an SDK key's risk weights
         * @description A platform the key has not overridden answers with the organization's values and `stored` false.
         */
        get: operations["readSdkKeyRiskWeights"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/sdk-keys/{sdk_key_id}/risk-weights/{platform}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Save an SDK key's risk weights for a platform
         * @description Overrides the organization's profile for this key alone.
         */
        put: operations["saveSdkKeyRiskWeightsPlatform"];
        post?: never;
        /**
         * Remove an SDK key's risk weights for a platform
         * @description The key follows the organization's profile again.
         */
        delete: operations["removeSdkKeyRiskWeightsPlatform"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/visitor-erasures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List visitor erasures
         * @description The last hundred erasures, newest first, each pending or done.
         */
        get: operations["listVisitorErasures"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/visitors/{visitor_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Erase a visitor
         * @description Erases everything this platform holds about one visitor. The identity goes at once, with the webhook events that name the visitor, so a device that comes back is a new visitor from that moment. The stored identifications, their deferred reports and the archived submissions follow within the hour, and the erasure's status turns from `pending` to `done`.
         *
         *     Asking again while one is pending returns that one. An identifier this organization never saw is accepted and erases nothing. Counts already folded into the dashboards are kept: they hold no identifier. Backups age out on their own thirty-day schedule.
         */
        delete: operations["eraseVisitor"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/webhook-deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List webhook delivery attempts */
        get: operations["listWebhookDeliveryAttempts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/webhooks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List webhook endpoints */
        get: operations["listWebhookEndpoints"];
        put?: never;
        /**
         * Create a webhook endpoint
         * @description The response carries the signing secret in full, once.
         */
        post: operations["createWebhookEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/webhooks/{webhook_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a webhook endpoint */
        delete: operations["deleteWebhookEndpoint"];
        options?: never;
        head?: never;
        /**
         * Update a webhook endpoint
         * @description Send only the fields to change. `paused` pauses or resumes the endpoint.
         */
        patch: operations["updateWebhookEndpoint"];
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/webhooks/{webhook_id}/redeliver": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Redeliver an event to a webhook endpoint */
        post: operations["redeliverEventWebhookEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/webhooks/{webhook_id}/rotate-secret": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Rotate a webhook endpoint's signing secret
         * @description The new secret is returned once. The previous secret keeps signing deliveries for `previous_secret_valid_hours`, 24 by default and at most 168.
         */
        post: operations["rotateWebhookEndpointSigningSecret"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/webhooks/{webhook_id}/test": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Send a test event to a webhook endpoint */
        post: operations["sendTestEventWebhookEndpoint"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/signals/catalogue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List signals
         * @description Every signal group and the signals in it, with the platforms each applies to. The vocabulary the weights routes are written in.
         */
        get: operations["listSignals"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AttestationChallengeOut: {
            /** @description Whether this key has an Apple app ID configured for App Attest */
            app_attest?: boolean;
            /** @description Base64-encoded one-use attestation nonce */
            challenge: string;
            /**
             * Format: date-time
             * @description When the nonce becomes unusable
             */
            expires_at: string;
        };
        CreatedWebhookOut: {
            endpoint: components["schemas"]["WebhookEndpointOut"];
            secret: string;
        };
        ErrorBody: {
            code: string;
            details?: components["schemas"]["ErrorDetail"][];
            message: string;
            /** Format: int64 */
            status: number;
        };
        ErrorDetail: {
            field: string;
            issue: string;
            location: string;
        };
        ErrorResponse: {
            error: components["schemas"]["ErrorBody"];
            request_id?: string;
        };
        EventRowOut: {
            agent?: string;
            agent_version?: string;
            anonymity_network?: string;
            asn?: string;
            asn_name?: string;
            country_code?: string;
            country_name?: string;
            device_kind?: string;
            environment: string;
            has_document: boolean;
            /** @description The network the request came from: an IPv4 /24 or an IPv6 /40, such as 203.0.113.0/24 */
            ip_network?: string;
            occurred_at: string;
            origin?: string;
            os?: string;
            platform: string;
            /** @description Why enrichment did not happen, on an unavailable event */
            reason?: string;
            request_id: string;
            sdk_platform: string;
            sdk_version: string;
            state: string;
            suspect_level?: string;
            /** Format: int32 */
            suspect_score?: number | null;
            tag?: string;
            triggers: components["schemas"]["EventTriggerOut"][];
            url_host?: string;
            url_path?: string;
            visitor_id: string;
            visitor_kind?: string;
        };
        EventTriggerOut: {
            confidence?: string;
            signal: string;
            /** Format: int32 */
            weight: number;
        };
        HostedDomainOut: {
            /** Format: date-time */
            activated_at?: string | null;
            /** Format: date-time */
            checked_at?: string | null;
            /** Format: date-time */
            created_at: string;
            hostname: string;
            id: string;
            path: string;
            /** @description What is holding the certificate up, in the provider's words */
            problem?: string;
            /** @description pending, active or failed */
            status: string;
        };
        HostedDomainsOut: {
            /** @description Whether hosted domains can be added on this deployment */
            available: boolean;
            domains: components["schemas"]["HostedDomainOut"][];
            /** @description What each hosted domain's CNAME points at */
            target?: string;
        };
        IdentifyIn: {
            /** @description The SDK's consent state; must be granted, or the request is refused with consent_required */
            consent?: string;
            /** @description Which SDK collected these signals */
            sdk?: components["schemas"]["SDKInfo"];
            /** @description The platform-specific signals the SDK collected */
            signals?: {
                [key: string]: unknown;
            };
            /** @description An opaque value echoed back on the event */
            tag?: string;
        };
        IdentifyOut: {
            /** @description Short-lived capability for the deferred signal report */
            deferred_token?: string;
            /** @description This submission was answered before; the verdict belongs to the first one */
            duplicate?: boolean;
            /** @description False when the report carried too little to identify anyone */
            identifiable: boolean;
            /** @description Why enrichment did not happen. Only answered to a secret key; a browser or app reads it on the server-side event read */
            reason?: string;
            /** @description Identifies this submission */
            request_id: string;
            /** @description Whether the address could be enriched */
            state: string;
            /** @description low, medium or high. Absent whenever suspect_score is */
            suspect_level?: string;
            /**
             * Format: int32
             * @description The weighted sum of the signals that fired. Absent when the event was not scored, or from a browser, an app, a proxy or a hosted domain when the key withholds it
             */
            suspect_score?: number | null;
            /** @description What fired, and what each was worth. Only answered to a secret key called directly; everyone else reads them on the server-side event read, webhooks and the dashboard */
            triggers?: components["schemas"]["IdentifyTriggerOut"][];
            /**
             * Format: int32
             * @description How sure we are about visitor_id, 0 to 100
             */
            visitor_confidence: number;
            /** @description Who this visitor is, stable across their visits */
            visitor_id: string;
            /** @description Whether this is the first time this visitor has been seen */
            visitor_is_new: boolean;
        };
        IdentifyTriggerOut: {
            confidence?: string;
            group?: string;
            signal: string;
            /**
             * Format: int64
             * @description What this signal added to the score
             */
            weight?: number | null;
        };
        IngestIn: {
            /** @description The SDK's consent state; must be granted, or the request is refused with consent_required */
            consent?: string;
            /** @description Which SDK collected these signals */
            sdk?: components["schemas"]["SDKInfo"];
            /** @description The platform-specific signals the SDK collected */
            signals?: {
                [key: string]: unknown;
            };
            /** @description An opaque value echoed back on the event. Identify only */
            tag?: string;
            /** @description The deferred_token returned by identify. Present only on a deferred report */
            token?: string;
        };
        IssuedProxyCredentialOut: {
            credential: components["schemas"]["ProxyCredentialOut"];
            /** @description Returned once and never stored in plaintext */
            secret: string;
        };
        IssuedSDKKeyOut: {
            key: components["schemas"]["SDKKeyOut"];
            secret: string;
        };
        ManagementCallerOut: {
            key_id: string;
            name: string;
            /** @description The organization every management route acts on */
            organization_id: string;
            /** @description admin or developer */
            role: string;
        };
        ProxyCredentialOut: {
            /** Format: date-time */
            created_at: string;
            environment: string;
            /** Format: date-time */
            expires_at?: string | null;
            id: string;
            /** @description cloudflare_worker, server_sdk or custom */
            kind: string;
            last4: string;
            /** @description The page origin last seen through the proxy */
            last_origin?: string;
            /** Format: date-time */
            last_used_at?: string | null;
            /** @description What the proxy last reported itself as, such as cloudflare-worker/0.2.0 */
            last_version?: string;
            name: string;
            /** @description Where the browser SDK posts on your site */
            path?: string;
            prefix: string;
            /**
             * Format: int64
             * @description Requests forwarded over the last 30 days
             */
            requests_30d: number;
            /** Format: date-time */
            revoked_at?: string | null;
            status: string;
        };
        ProxyCredentialsOut: {
            credentials: components["schemas"]["ProxyCredentialOut"][];
        };
        RiskWeightsOut: {
            /** Format: int64 */
            max_weight: number;
            organization_id: string;
            platforms: components["schemas"]["RiskWeightsPlatformOut"][];
            /** @description organization or key */
            scope: string;
            sdk_key_id?: string;
        };
        RiskWeightsPlatformOut: {
            defaults: {
                [key: string]: number;
            };
            platform: string;
            /** @description method or confidence */
            residential_proxy_weights_mode: string;
            /** Format: int64 */
            revision?: number;
            /** @description key, organization or default */
            scope: string;
            signals: string[];
            /** @description Whether this scope has its own saved configuration */
            stored: boolean;
            /** Format: int64 */
            suspect_threshold: number;
            /** Format: date-time */
            updated_at?: string;
            updated_by_user_id?: string;
            /** @description method or confidence */
            vpn_weights_mode: string;
            weights: {
                [key: string]: number;
            };
        };
        SDKEventOut: {
            agent?: string;
            agent_version?: string;
            anonymity_network?: string;
            asn?: string;
            asn_name?: string;
            country_code?: string;
            country_name?: string;
            device_kind?: string;
            /** @description What Fingerly keeps of the submission, present when has_document is true: the schema, request id, time, SDK, IP network, the city-level IP answer, the risk score and triggers, attestation and the velocity decisions. Never the raw signals, the user agent or the address. Its contents are not a public contract. */
            document?: Record<string, never> | null;
            environment: string;
            has_document: boolean;
            /** @description The network the request came from: an IPv4 /24 or an IPv6 /40, such as 203.0.113.0/24 */
            ip_network?: string;
            occurred_at: string;
            origin?: string;
            os?: string;
            platform: string;
            /** @description Why enrichment did not happen, on an unavailable event */
            reason?: string;
            request_id: string;
            sdk_platform: string;
            sdk_version: string;
            state: string;
            suspect_level?: string;
            /** Format: int32 */
            suspect_score?: number | null;
            tag?: string;
            triggers: components["schemas"]["EventTriggerOut"][];
            url_host?: string;
            url_path?: string;
            visitor_id: string;
            visitor_kind?: string;
        };
        SDKEventsOut: {
            /** Format: int64 */
            page: number;
            /** Format: int64 */
            page_size: number;
            rows: components["schemas"]["EventRowOut"][];
        };
        SDKInfo: {
            /** @description The SDK that collected these signals. Bound to how the request authenticated; a contradiction is normalised, not trusted */
            platform: string;
            /** @description The SDK's version, such as 0.1.0 */
            version: string;
        };
        SDKKeyOut: {
            allowed_android_packages: string[];
            allowed_android_signers: string[];
            allowed_apple_app_ids: string[];
            allowed_origins: string[];
            /** Format: date-time */
            created_at: string;
            created_by?: string;
            environment: string;
            /** Format: date-time */
            expires_at?: string | null;
            /** @description Whether suspect_score and suspect_level are withheld from a browser, an app, a proxy and a hosted domain */
            hide_client_score: boolean;
            id: string;
            /** @description public or secret */
            kind: string;
            /** @description The tail of the secret, which is all a console ever shows */
            last4: string;
            /**
             * Format: date-time
             * @description Written best-effort and batched
             */
            last_used_at?: string | null;
            name: string;
            /** @description The human-readable stem, such as fly_pk_production */
            prefix: string;
            project_id: string;
            /** @description Whether native reports without verified hardware attestation are refused */
            require_attestation: boolean;
            /** Format: date-time */
            revoked_at?: string | null;
            revoked_by?: string;
            /** @description active or revoked */
            status: string;
        };
        SDKKeysOut: {
            keys: components["schemas"]["SDKKeyOut"][];
        };
        SignalCatalogueOut: {
            /** Format: int64 */
            default_threshold: number;
            groups: components["schemas"]["SignalGroupOut"][];
            /** Format: int64 */
            max_weight: number;
            platforms: string[];
        };
        SignalGroupOut: {
            description: string;
            inactive_on?: string[];
            key: string;
            label: string;
            platforms: string[];
            signals: components["schemas"]["SignalMemberOut"][];
            weights: {
                [key: string]: number;
            };
        };
        SignalMemberOut: {
            inactive_on?: string[];
            signal: string;
            weights: {
                [key: string]: number;
            };
        };
        SupplementOut: {
            /** @description The identical supplement was accepted before */
            duplicate?: boolean;
            request_id: string;
        };
        VisitorErasureOut: {
            /**
             * Format: date-time
             * @description When everything else was removed
             */
            completed_at?: string | null;
            id: string;
            /**
             * Format: date-time
             * @description When it was asked for, and when the identity itself was removed
             */
            requested_at: string;
            /** @description pending while the stored identifications and archived submissions are being removed, then done */
            status: string;
            visitor_id: string;
        };
        VisitorErasuresOut: {
            erasures: components["schemas"]["VisitorErasureOut"][];
        };
        WebhookDeliveriesOut: {
            deliveries: components["schemas"]["WebhookDeliveryOut"][];
            next_cursor?: string | null;
        };
        WebhookDeliveryOut: {
            /** Format: int64 */
            attempt: number;
            /** Format: int64 */
            duration_ms: number;
            endpoint_id: string;
            endpoint_url: string;
            environment: string;
            error?: string | null;
            event: string;
            event_id: string;
            id: string;
            /** Format: date-time */
            occurred_at: string;
            /** Format: int64 */
            response_code?: number | null;
            status: string;
        };
        WebhookEndpointOut: {
            /** Format: date-time */
            created_at: string;
            created_by?: string | null;
            /** Format: int64 */
            delivered_24h: number;
            description: string;
            environment: string;
            events: string[];
            /** Format: int64 */
            failed_24h: number;
            id: string;
            /** Format: date-time */
            last_delivery_at?: string | null;
            /** Format: date-time */
            previous_secret_expires_at?: string | null;
            secret_last4: string;
            status: string;
            url: string;
        };
        WebhookTestOut: {
            event_id: string;
        };
        WebhooksOut: {
            endpoints: components["schemas"]["WebhookEndpointOut"][];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    requestAttestationChallenge: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AttestationChallengeOut"];
                };
            };
            /** @description No usable x-api-key header was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The organization this key belongs to is not accepting traffic */
            402: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Challenges are being requested faster than the rate limit allows */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description A challenge could not be issued just now */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listEvents: {
        parameters: {
            query?: {
                /** @description Start, inclusive (RFC 3339); defaults to 24 hours ago */
                from?: string;
                /** @description End, exclusive (RFC 3339); defaults to now */
                to?: string;
                /** @description One-based page */
                page?: number;
                /** @description Rows per page, capped at 200 */
                limit?: number;
                /** @description Exact visitor id */
                visitor?: string;
                /** @description low, medium or high */
                level?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SDKEventsOut"];
                };
            };
            /** @description No usable secret SDK key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getEvent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                request_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SDKEventOut"];
                };
            };
            /** @description No usable secret SDK key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `event_not_found`: no event with that request ID in this key's environment, or it is older than 30 days. `event_pending`: the identification was accepted and is still being recorded; retry after the `Retry-After` seconds */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    submitDeferredReport: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                request_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description The SDK's consent state; must be granted, or the request is refused with consent_required */
                    consent?: string;
                    /** @description Which SDK collected these signals */
                    sdk?: components["schemas"]["SDKInfo"];
                    /** @description A report containing only the deferred tier */
                    signals?: {
                        [key: string]: unknown;
                    };
                    /** @description The deferred_token returned by identify */
                    token?: string;
                };
            };
        };
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SupplementOut"];
                };
            };
            /** @description No usable x-api-key header was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The organization this key belongs to is not accepting traffic */
            402: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description A different deferred report was already accepted for this request */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The report could not be accepted just now */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    identifyVisitor: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IdentifyIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IdentifyOut"];
                };
            };
            /** @description No usable x-api-key header was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The organization this key belongs to is not accepting traffic */
            402: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The body is over 1 MiB */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The organization is over its rate limit */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The identification could not be answered just now */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    submitFromClientSdk: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["IngestIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IdentifyOut"];
                };
            };
            /** @description The deferred report was accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No usable x-api-key header was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The organization this key belongs to is not accepting traffic */
            402: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The body is over 1 MiB */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The organization is over its rate limit */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The submission could not be answered just now */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    describeManagementKey: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManagementCallerOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listHostedDomains: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HostedDomainsOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage hosted domains */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    addHostedDomain: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description A subdomain of your site, such as k7.shop.example, that you will CNAME to target */
                    hostname?: string;
                    /** @description Where the browser SDK posts on it. Omit it for a random one */
                    path?: string;
                };
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HostedDomainOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage hosted domains */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The hostname is taken, or hosted domains are not available */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The hostname or path is not usable */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    removeHostedDomain: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                hosted_domain_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage hosted domains */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    checkHostedDomainNow: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                hosted_domain_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HostedDomainOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage hosted domains */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listProxyKeys: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProxyCredentialsOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage proxy keys */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    issueProxyKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description production, staging or development */
                    environment?: string;
                    /** @description cloudflare_worker, server_sdk or custom. Defaults to custom */
                    kind?: string;
                    name?: string;
                    /** @description Where the browser SDK posts on your site, such as /k7x2qm4a. Omit it for a random one */
                    path?: string;
                };
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssuedProxyCredentialOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage proxy keys */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateProxyKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                proxy_credential_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description cloudflare_worker, server_sdk or custom */
                    kind?: string;
                    name?: string;
                    /** @description Where the browser SDK posts on your site. Omit it for a new random one */
                    path?: string;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProxyCredentialOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage proxy keys */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The path is not usable, or the kind is not known */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    revokeProxyKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                proxy_credential_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProxyCredentialOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may manage proxy keys */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    readOrganizationRiskWeights: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization whose weights these are */
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RiskWeightsOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    saveOrganizationRiskWeightsPlatform: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization whose weights these are */
                organization_id: string;
                /** @description web, android or ios */
                platform: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description method or confidence */
                    residential_proxy_weights_mode?: string | null;
                    /**
                     * Format: int64
                     * @description The revision this edit was made against
                     */
                    revision?: number | null;
                    /**
                     * Format: int64
                     * @description The score at which a request is called suspicious
                     */
                    suspect_threshold?: number | null;
                    /** @description method or confidence */
                    vpn_weights_mode?: string | null;
                    /** @description Signal name to weight, 0-10000 */
                    weights?: {
                        [key: string]: number;
                    };
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RiskWeightsPlatformOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may change risk weights */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The weights changed since they were read */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description A weight, a mode or the threshold is not usable */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    restoreDefaultRiskWeightsPlatform: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization whose weights these are */
                organization_id: string;
                /** @description web, android or ios */
                platform: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RiskWeightsPlatformOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may change risk weights */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listSdkKeys: {
        parameters: {
            query?: {
                /** @description The project whose keys these are */
                project_id?: string;
            };
            header?: never;
            path: {
                /** @description The organization whose keys these are */
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SDKKeysOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The key's role cannot manage SDK keys */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    issueSdkKey: {
        parameters: {
            query?: {
                /** @description The project to issue into */
                project_id?: string;
            };
            header?: never;
            path: {
                /** @description The organization to issue into */
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Android package names, such as com.example.app */
                    allowed_android_packages?: string[];
                    /** @description SHA-256 signing certificate digests, 64 hex characters */
                    allowed_android_signers?: string[];
                    /** @description Apple app IDs: Team ID, a dot, then the bundle identifier */
                    allowed_apple_app_ids?: string[];
                    /** @description Scheme and host, no path. A public key names at least one origin, Android package or Apple app ID */
                    allowed_origins?: string[];
                    /** @description production, staging or development */
                    environment?: string;
                    /** Format: date-time */
                    expires_at?: string | null;
                    /** @description Withhold suspect_score and suspect_level from a browser, an app, a proxy and a hosted domain. Defaults to false */
                    hide_client_score?: boolean;
                    /** @description public or secret */
                    kind?: string;
                    /** @description What the key is called. The only part a person can recognise once the secret is masked */
                    name?: string;
                };
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["IssuedSDKKeyOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The key could not be issued as described */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    replaceNativeAppsPublicKeyMayBeUsedFrom: {
        parameters: {
            query?: {
                /** @description The project the key belongs to */
                project_id?: string;
            };
            header?: never;
            path: {
                /** @description The organization the key belongs to */
                organization_id: string;
                /** @description The key to scope */
                sdk_key_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Android package names, such as com.example.app. Empty means not configured */
                    allowed_android_packages?: string[];
                    /** @description SHA-256 signing certificate digests, 64 hex characters. Empty means not configured */
                    allowed_android_signers?: string[];
                    /** @description Apple app IDs: Team ID, a dot, then the bundle identifier. Empty means not configured */
                    allowed_apple_app_ids?: string[];
                    /** @description Refuse native reports whose hardware attestation did not verify. Leave out to keep the current setting */
                    require_attestation?: boolean | null;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SDKKeyOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The key is revoked */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An entry is not valid, or the key is secret */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    setWhatKeyPublicCallersAreTold: {
        parameters: {
            query?: {
                /** @description The project the key belongs to */
                project_id?: string;
            };
            header?: never;
            path: {
                /** @description The organization the key belongs to */
                organization_id: string;
                /** @description The key to change */
                sdk_key_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description True to withhold suspect_score and suspect_level from a browser, an app, a proxy and a hosted domain. The event is still scored and stored, and a secret key called directly still sees everything */
                    hide_score?: boolean | null;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SDKKeyOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The key is revoked */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description hide_score is missing */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    replacePublicKeyAllowedOrigins: {
        parameters: {
            query?: {
                /** @description The project the key belongs to */
                project_id?: string;
            };
            header?: never;
            path: {
                /** @description The organization the key belongs to */
                organization_id: string;
                /** @description The key to re-scope */
                sdk_key_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Scheme and host, no path. Empty refuses everything */
                    allowed_origins?: string[];
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SDKKeyOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The key is revoked */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An origin is not valid, or the key is secret */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    revokeSdkKey: {
        parameters: {
            query?: {
                /** @description The project the key belongs to */
                project_id?: string;
            };
            header?: never;
            path: {
                /** @description The organization the key belongs to */
                organization_id: string;
                /** @description The key to act on */
                sdk_key_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SDKKeyOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The key is already revoked */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    readSdkKeyRiskWeights: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the key belongs to */
                organization_id: string;
                /** @description The key whose weights these are */
                sdk_key_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RiskWeightsOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    saveSdkKeyRiskWeightsPlatform: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the key belongs to */
                organization_id: string;
                /** @description The key whose weights these are */
                sdk_key_id: string;
                /** @description web, android or ios */
                platform: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description method or confidence */
                    residential_proxy_weights_mode?: string | null;
                    /**
                     * Format: int64
                     * @description The revision this edit was made against
                     */
                    revision?: number | null;
                    /**
                     * Format: int64
                     * @description The score at which a request is called suspicious
                     */
                    suspect_threshold?: number | null;
                    /** @description method or confidence */
                    vpn_weights_mode?: string | null;
                    /** @description Signal name to weight, 0-10000 */
                    weights?: {
                        [key: string]: number;
                    };
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RiskWeightsPlatformOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may change risk weights */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The weights changed since they were read */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description A weight, a mode or the threshold is not usable */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    removeSdkKeyRiskWeightsPlatform: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the key belongs to */
                organization_id: string;
                /** @description The key whose override is being removed */
                sdk_key_id: string;
                /** @description web, android or ios */
                platform: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RiskWeightsPlatformOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may change risk weights */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listVisitorErasures: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization */
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisitorErasuresOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may erase a visitor */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    eraseVisitor: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the visitor belongs to */
                organization_id: string;
                /** @description The visitor to erase, as identifications report it */
                visitor_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VisitorErasureOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Only an admin key may erase a visitor */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not a visitor identifier */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listWebhookDeliveryAttempts: {
        parameters: {
            query?: {
                environment?: string;
                limit?: number;
                cursor?: string;
            };
            header?: never;
            path: {
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WebhookDeliveriesOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listWebhookEndpoints: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WebhooksOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createWebhookEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    description?: string;
                    environment?: string;
                    events?: string[];
                    url?: string;
                };
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedWebhookOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteWebhookEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                webhook_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateWebhookEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                webhook_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    description?: string | null;
                    environment?: string | null;
                    events?: string[] | null;
                    paused?: boolean | null;
                    url?: string | null;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WebhookEndpointOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    redeliverEventWebhookEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                webhook_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    event_id?: string;
                };
            };
        };
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    rotateWebhookEndpointSigningSecret: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                webhook_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: int64 */
                    previous_secret_valid_hours?: number | null;
                };
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedWebhookOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    sendTestEventWebhookEndpoint: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                webhook_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WebhookTestOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The request could not be validated. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listSignals: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SignalCatalogueOut"];
                };
            };
            /** @description No usable management key was presented */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The management key's role does not allow this */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such resource in the key's organization */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description An unexpected error occurred. */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
}
