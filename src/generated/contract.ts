export interface paths {
    "/api/v1/agents/sightings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Report the requests your server served
         * @description Reports up to 200 requests your server served, as raw input, and answers what sent each one: `visitor_kind`, the agent's name and, for an AI agent, the `ai` object with how its claim was checked. AI crawlers and fetchers that never run a page's JavaScript are seen only this way.
         *
         *     Free, and never part of the identification count. Each answer carries a `ttl`: the seconds it may be reused for the exact same user agent, address and Signature-Agent, so a server SDK reports a repeat request as a `count` on its next call rather than asking again. A signed request has a `ttl` of 0. When `rules_version` changes, drop every remembered answer.
         *
         *     Calls are limited per key and per server address, and items per organization per day; a refused call answers `429` with `Retry-After` and `Fingerly-RateLimit-Scope`, and a server SDK then treats its requests as unchecked and serves them as usual.
         */
        post: operations["reportRequestsYourServerServed"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
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
    "/api/v1/events/{request_id}/consume": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark an event consumed, once
         * @description Marks one identification event as consumed, atomically and once per organization, so a request ID handed from a page to your backend backs one decision only. The first call answers `200` with `first: true`; every later call answers `409 event_already_consumed`, with the first consume's time in the error's `details` entry for the field `consumed_at`. Read and check the event before you consume it. The flag is kept with the event and erased with it.
         */
        post: operations["markEventConsumedOnce"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events/{request_id}/device-check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set the device's DeviceCheck bits
         * @description Spends the write DeviceCheck token held for this iOS event, once, to set bit0, bit1 or both with Apple, using your project's own Apple key. A bit left out keeps its value. The bits mean what you decide; Fingerly never reads them. Apple answers a write with no previous value; the event's read token, spent by the query route, is separate, so one identification supports one read and one write. Tokens are held for one hour, only for events whose App Attest evidence covered them, and only when DeviceCheck is switched on for the project's Apple credential. After a `503`, retry with the same bits: a token kept for a retry accepts only the request it was first used for.
         */
        put: operations["setDeviceDevicecheckBits"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/events/{request_id}/device-check/query": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Read the device's DeviceCheck bits
         * @description Spends the read DeviceCheck token held for this iOS event, once, to read the device's two bits from Apple. Apple asks for each token to be used once, so the event holds a second token for the write route: to read and then mark a device, read and write on the same identification. After a `503`, retry the read: a token kept for a retry accepts only the request it was first used for.
         */
        post: operations["readDeviceDevicecheckBits"];
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
         * @description The one URL the client SDKs and every first-party proxy post to. Forwards the single-pass v3 identification envelope and answers `200` with the verdict, exactly as the identify route answers.
         *
         *     It exists so a proxy can forward everything it receives to a single path of the customer's choosing, with nothing appended that a content blocker could match across sites. An `Idempotency-Key` header is required on every call.
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
    "/api/v1/management/organizations/{organization_id}/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List projects
         * @description Every project of the organization, archived ones included.
         */
        get: operations["listProjects"];
        put?: never;
        /**
         * Create a project
         * @description One project per client app or site keeps its visitors, velocity, keys and data apart from every other project. `name` is 1 to 128 characters and unique in the organization.
         */
        post: operations["createProject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/projects/{project_id}": {
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
         * Archive a project
         * @description Revokes the project's keys, so its traffic stops at once, and keeps its data. There is no un-archive.
         */
        delete: operations["archiveProject"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/projects/{project_id}/attestation-credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List a project's Apple and Google credentials
         * @description Metadata only: the Team ID, key ID or Cloud project number, a fingerprint of the public key and the last error the platform returned. The secret is never returned.
         */
        get: operations["listProjectAppleAndGoogleCredentials"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/projects/{project_id}/attestation-credentials/apple": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Upload or replace a project's Apple key
         * @description The key (a .p8 file with DeviceCheck enabled) is used only for this project's apps: to refresh App Attest receipts and, with device_check_enabled, to read and write DeviceCheck bits on your backend's request. It is sealed on arrival and never returned. Owner or admin only.
         */
        put: operations["uploadOrReplaceProjectAppleKey"];
        post?: never;
        /**
         * Delete a project's Apple key
         * @description Takes effect everywhere within ten minutes. Owner or admin only.
         */
        delete: operations["deleteProjectAppleKey"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/projects/{project_id}/attestation-credentials/google-play": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Upload or replace a project's Google service account
         * @description A service account in the Google Cloud project linked to the app in Play Console, used only to decode this project's Play Integrity tokens, within daily_budget decodes a day. Sealed on arrival and never returned. Owner or admin only.
         */
        put: operations["uploadOrReplaceProjectGoogleServiceAccount"];
        post?: never;
        /**
         * Delete a project's Google service account
         * @description Takes effect everywhere within ten minutes. Owner or admin only.
         */
        delete: operations["deleteProjectGoogleServiceAccount"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/projects/{project_id}/installs/{platform}/{install_id}": {
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
         * Erase the visitor of one app install
         * @description Erases the visitor an iOS or Android app install resolved to in this project, for a data subject's request that names the app and the install rather than a visitor ID. `install_id` is the identifier the Fingerly SDK stored in the app. Visitors are never shared between projects, so this finds the project's visitor and no other; the erasure then proceeds as one by visitor ID, and the answer lists it.
         *
         *     404 `install_not_found` means no stored identity maps to the install, so no data can be linked to it.
         */
        delete: operations["eraseVisitorOfOneAppInstall"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/projects/{project_id}/purge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List a project's purge passes */
        get: operations["listProjectPurgePasses"];
        put?: never;
        /**
         * Delete all of a project's data
         * @description Owner or admin, or an admin management key. Archives the project if it is not archived yet - its keys are revoked at once, so no new data arrives - and deletes all of its data: its archived submissions, its stored identifications and rollups, its visitor identities, the webhook events that name it, its keys' attestation state and its Apple and Google platform credentials. There is no undo.
         *
         *     It runs twice: ten minutes after the request, and again a day after the first pass finished, for anything delivered late. Asking while a pass is pending returns it; asking after the purge finished queues another pass. Usage counts and the project's revoked keys are kept, because invoices and usage reports name them.
         *
         *     `archive_copies_expire_by` is when the last archived copy written before per-project archiving expires.
         */
        post: operations["deleteAllOfProjectData"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/management/organizations/{organization_id}/projects/{project_id}/usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read one project's metered traffic, per day and per key
         * @description The same report for the keys of one project, for re-billing one client.
         */
        get: operations["readOneProjectMeteredTrafficPerDayAndPerKey"];
        put?: never;
        post?: never;
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
    "/api/v1/management/organizations/{organization_id}/usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read metered traffic, per day and per key
         * @description The organization's usage, as the console's usage screen reads it: whole UTC days, half-open, `scope` all, live or test, with billed amounts and settled days.
         */
        get: operations["readMeteredTrafficPerDayAndPerKey"];
        put?: never;
        post?: never;
        delete?: never;
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
        AIAgentOut: {
            /** @description True when the agent named itself, in its user agent or a signature */
            declared: boolean;
            /** @description The agent as its operator names it, such as GPTBot or Claude-User */
            name: string;
            /** @description The company that operates the agent, such as OpenAI, Anthropic or Google */
            provider: string;
            /**
             * @description What the operator says the traffic is for: training (collecting content to train models), search (indexing for an AI answer or search product), user_fetch (reading a page a person asked an assistant to read) or agent (driving a browser on a person's behalf). New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            purpose: "training" | "search" | "user_fetch" | "agent";
            /**
             * @description Where the agent runs: provider_cloud (the operator's own infrastructure), hosted_browser (a third party's cloud browser) or user_device (a person's own browser). New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            runtime: "provider_cloud" | "hosted_browser" | "user_device";
            /** @description How the agent's claimed identity was checked, and what that found */
            verification: components["schemas"]["AIVerificationOut"];
        };
        AIVerificationOut: {
            /**
             * @description signature (a signed request), ip_list (the operator's published address ranges), reverse_dns (a reverse lookup confirmed forward) or none. New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            method: "signature" | "ip_list" | "reverse_dns" | "none";
            /**
             * @description pass (the claim held), fail (it was checked and did not hold) or not_attempted. New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            result: "pass" | "fail" | "not_attempted";
        };
        AgentSightingIn: {
            /** @description The client's address from the server's trusted socket or edge header: one IPv4 or IPv6 literal, never a forwarded list */
            client_ip: string;
            /**
             * Format: int64
             * @description How many times this exact request was served since the last report, this one included; 1 when absent, at most 1000000
             */
            count?: number;
            /** @description The Host the request was sent to, which a signing agent signs. At most 4096 bytes */
            host?: string;
            /** @description The request method; GET when absent. At most 4096 bytes */
            method?: string;
            /** @description The Signature header, when the request had one. At most 4096 bytes */
            signature?: string;
            /** @description The Signature-Agent header, when the request had one. At most 4096 bytes */
            signature_agent?: string;
            /** @description The Signature-Input header, when the request had one. At most 4096 bytes */
            signature_input?: string;
            /** @description The request's User-Agent header, as received; empty when it had none. At most 4096 bytes */
            user_agent: string;
        };
        AgentSightingOut: {
            /** @description The agent's name where the server knows it, such as GPTBot or Googlebot. Absent for a person's browser */
            agent?: string;
            /** @description Present when visitor_kind is ai_bot: who operates the agent, what its traffic is for, and how far its claim was checked */
            ai?: components["schemas"]["AIAgentOut"] | null;
            /**
             * Format: int64
             * @description Seconds this answer may be reused for the exact same user agent, address and Signature-Agent; 0 for a signed request, which is checked every time, and for a request the server could not use
             */
            ttl: number;
            /**
             * @description human, ai_bot, automation or search_crawler; unknown for a request the server could not use (a field over its limit, an address that is not one literal, or a count over 1000000), which is neither classified nor counted. New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            visitor_kind: "human" | "ai_bot" | "automation" | "search_crawler" | "unknown";
        };
        AgentSightingsIn: {
            /** @description The requests, at most 200. Each is answered in the same position of the answer's items */
            items?: components["schemas"]["AgentSightingIn"][];
        };
        AgentSightingsOut: {
            /** @description One answer per reported request, in the same order */
            items: components["schemas"]["AgentSightingOut"][];
            /** @description Names the classification rules; when it changes, drop every remembered answer */
            rules_version: string;
        };
        AttestEnvelope: {
            /** @description Base64 CBOR App Attest assertion object */
            assertion?: string;
            /** @description Base64 CBOR App Attest attestation object */
            attestation_object?: string;
            /** @description Base64 DER X.509 certificate chain for Android key registration */
            certificate_chain?: string[];
            /** @description Stateless server-signed challenge ticket */
            challenge: string;
            /** @description Optional standard Base64 Apple DeviceCheck token, at most 4 KiB decoded, bound into statementDigest. Held for one hour and spent by POST /events/{request_id}/device-check/query */
            device_token?: string;
            /** @description Optional second standard Base64 Apple DeviceCheck token, at most 4 KiB decoded, bound into statementDigest. Held for one hour and spent by PUT /events/{request_id}/device-check */
            device_token_write?: string;
            /** @description Canonical 36-char lowercase UUIDv4 matching sources.identity.value.install_id */
            install_id: string;
            /** @description Base64 App Attest key ID (iOS) or 64-char hex SPKI SHA-256 (Android) */
            key_id?: string;
            /** @description app_attest_register, app_attest_assert, android_key_register, or android_key_assert */
            mode: string;
            /** @description Optional Google Play Integrity token with requestHash equal to hex(statementDigest) */
            play_integrity_token?: string;
            /** @description iOS, app_attest_register only: standard Base64 CBOR App Attest assertion by the previous confirmed key (prev_key_id) with clientDataHash equal to statementDigest */
            prev_assertion?: string;
            /** @description Optional key ID of the previous confirmed key: 64-char hex (Android) or standard Base64 App Attest key ID (iOS, app_attest_register only) */
            prev_key_id?: string;
            /** @description Optional Base64 ASN.1 DER signature by retiring Android key over identical framedPreimage */
            prev_signature?: string;
            /**
             * Format: int64
             * @description Inline Android lease renewal attempt counter (0 or 1)
             */
            reattest_attempt?: number;
            /** @description Base64 ASN.1 DER SHA256withECDSA signature over framedPreimage */
            signature?: string;
        };
        AttestationChallengeOut: {
            /** @description Whether this key has an Apple app ID configured for App Attest */
            app_attest?: boolean;
            /** @description Base64-encoded one-use attestation nonce */
            challenge: string;
            /** @description Whether to send a DeviceCheck token with the App Attest evidence */
            device_check?: boolean;
            /** @description The project's 32-byte name digest salt, unpadded base64url. The SDK caches it per SDK key and sends each name digest as the first 16 bytes of HMAC-SHA256(salt, name) in hex, with digest_salt_id. Absent when the server has none to give; the SDK then uses 32 zero bytes */
            digest_salt?: string;
            /**
             * Format: date-time
             * @description When the nonce becomes unusable
             */
            expires_at: string;
            /** @description Whether to send a Play Integrity token bound to this challenge */
            play_integrity?: boolean;
        };
        AttestationCredentialOut: {
            /** @description Google only */
            client_email?: string;
            /**
             * Format: int64
             * @description Google only
             */
            cloud_project_number?: number;
            /** Format: date-time */
            created_at: string;
            /**
             * Format: int64
             * @description Google only
             */
            daily_budget?: number;
            /** @description Apple only */
            device_check_enabled?: boolean;
            /** @description Lowercase hex SHA-256 of the public key, to recognise the key without the secret */
            fingerprint: string;
            /** @description Apple only */
            key_id?: string;
            /** @description A short token for the last refusal from Apple or Google, such as apple-401 */
            last_error?: string;
            /** Format: date-time */
            last_error_at?: string | null;
            /** Format: date-time */
            last_used_at?: string | null;
            /** @description apple or google-play */
            provider: string;
            /** @description Apple only */
            team_id?: string;
            /** Format: date-time */
            updated_at: string;
        };
        AttestationCredentialsOut: {
            credentials: components["schemas"]["AttestationCredentialOut"][];
        };
        CreatedWebhookOut: {
            endpoint: components["schemas"]["WebhookEndpointOut"];
            secret: string;
        };
        DeviceCheckQueryOut: {
            bit0: boolean;
            bit1: boolean;
            /** @description False when Apple holds no bits for the device */
            found: boolean;
            /** @description When the bits last changed, YYYY-MM */
            last_update?: string;
        };
        DeviceCheckWriteOut: {
            bit0?: boolean | null;
            bit1?: boolean | null;
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
            /** @description Present when visitor_kind is ai_bot: who operates the agent, what its traffic is for, and how far its claim was checked */
            ai?: components["schemas"]["AIAgentOut"] | null;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            anonymity_network?: "tor" | "relay" | "vpn" | "proxy" | "hosting";
            asn?: string;
            asn_name?: string;
            country_code?: string;
            country_name?: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            device_kind?: "desktop" | "mobile" | "tablet" | "server";
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            environment: "production" | "staging" | "development";
            has_document: boolean;
            /** @description The network the request came from: an IPv4 /24 or an IPv6 /40, such as 203.0.113.0/24 */
            ip_network?: string;
            occurred_at: string;
            origin?: string;
            os?: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            platform: "web" | "android" | "ios";
            /** @description The project the event belongs to */
            project_id?: string;
            /** @description Why enrichment did not happen, on an unavailable event */
            reason?: string;
            request_id: string;
            sdk_platform: string;
            sdk_version: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            state: "enriched" | "unavailable";
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            suspect_level?: "low" | "medium" | "high";
            /** Format: int32 */
            suspect_score?: number | null;
            tag?: string;
            triggers: components["schemas"]["EventTriggerOut"][];
            url_host?: string;
            url_path?: string;
            visitor_id: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            visitor_kind?: "human" | "ai_bot" | "automation" | "search_crawler";
        };
        EventTriggerOut: {
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            confidence?: "low" | "medium" | "high";
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            signal: "tor" | "ios_simulator" | "mitm_attack" | "frida_detected" | "virtual_machine" | "remote_control" | "datacenter_proxy" | "ip_blocklist" | "rooted_device" | "jailbroken_device" | "android_emulator" | "cloned_app" | "browser_tampering" | "fingerprint_suppressed" | "identity_obfuscated" | "developer_tools" | "device_farm" | "bot" | "ip_reputation" | "residential_proxy" | "privacy_settings" | "embedded_web_view" | "high_activity" | "location_spoofing" | "vpn" | "incognito_mode" | "active_call" | "attestation_missing" | "attestation_failed" | "device_inconsistent" | "report_incomplete" | "custom_root_ca" | "secondary_user_profile" | "network_anomaly";
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
            /** @description Hardware attestation envelope bound to raw signals bytes (v3 native SDKs) */
            attest?: components["schemas"]["AttestEnvelope"] | null;
            /**
             * @description Native only, and only without attest: why the SDK sent no attestation. One of not_offered, unsupported, challenge_unavailable, key_error, timeout, backoff, install_unavailable. Diagnostic; it never lowers the score
             * @enum {string}
             */
            attest_skipped?: "not_offered" | "unsupported" | "challenge_unavailable" | "key_error" | "timeout" | "backoff" | "install_unavailable";
            /**
             * @description The SDK's consent state; must be granted, or the request is refused with consent_required
             * @enum {string}
             */
            consent?: "granted";
            /** @description Web only: session asks for next_seal with an identified answer, which the page keeps for the life of its tab and sends back as seal. Omitted, no seal is issued and the page keeps nothing */
            continuity?: string;
            /** @description Empty for a report. ticket asks for a web freshness ticket instead: a public key on the web only, with a body of v, op and sdk, answered 200 with ticket and expires_at, never charged */
            op?: string;
            /** @description Which SDK collected these signals */
            sdk?: components["schemas"]["SDKInfo"];
            /** @description Web only, with continuity session: the next_seal of the previous answer in this tab. Bound to the project, the page origin and the browser's profile, valid for 30 minutes and renewed by each answer for at most 12 hours. One that does not verify is ignored */
            seal?: string;
            /** @description The platform-specific signals the SDK collected */
            signals?: {
                [key: string]: unknown;
            };
            /** @description An opaque value echoed back on the event and kept in long-lived rollups. A label for your own systems, such as a client or app name; never a personal identifier (user ID, email, install ID or advertising ID). A value holding a control character (U+0000 to U+001F, U+007F) is refused with invalid_request */
            tag?: string;
            /** @description Web only: the freshness ticket from a ticket request or the previous answer's next_ticket. Single use, bound to the key and page origin, valid for 300 seconds. A native report carrying one is refused with invalid_request */
            ticket?: string;
            /** @description Web only, next to a ticket whose answer carried pow_bits: the smallest decimal nonce n, from 0 up, such that SHA-256(ticket || ':' || n) starts with at least pow_bits zero bits */
            ticket_pow?: string;
            /**
             * Format: int64
             * @description Wire envelope version. Must equal 3.
             */
            v?: number;
        };
        IdentifyOut: {
            /** @description Present when visitor_kind is ai_bot: who operates the agent, what its traffic is for, and how far its claim was checked. Only answered to a secret key called directly */
            ai?: components["schemas"]["AIAgentOut"] | null;
            /** @description Native only, present whenever attest was sent: the key_id the server evaluated, copied from attest.key_id */
            attest_key_id?: string;
            /**
             * @description Native only, present whenever attest was sent: registered (the key was verified, stored and owns the install), valid (an assertion verified against a stored key), rekey_required (the key is unknown or expired), rejected (attestation failed). New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            attest_key_status?: "registered" | "valid" | "rekey_required" | "rejected";
            /** @description This submission was answered before; the verdict replays the first one */
            duplicate?: boolean;
            /** @description False when the report carried too little to identify anyone */
            identifiable: boolean;
            /** @description Fresh attestation challenge ticket and dynamic offer flags for the next native submission */
            next_attestation?: components["schemas"]["AttestationChallengeOut"] | null;
            /** @description Web only, when the report asked for continuity session and a private window was identified: the session seal to send as seal on the next report from this tab */
            next_seal?: components["schemas"]["WebSealOut"] | null;
            /** @description Web only: a fresh freshness ticket for the next report from this page, so it needs no ticket request */
            next_ticket?: components["schemas"]["WebTicketOut"] | null;
            /** @description Why enrichment did not happen. Only answered to a secret key; a browser or app reads it on the server-side event read */
            reason?: string;
            /** @description Identifies this submission */
            request_id: string;
            /**
             * @description Whether the address could be enriched. New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            state: "enriched" | "unavailable";
            /**
             * @description low, medium or high. Absent whenever suspect_score is. New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            suspect_level?: "low" | "medium" | "high";
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
            /** @description Who this visitor is, stable across their visits; empty when unidentifiable */
            visitor_id: string;
            /** @description Whether this is the first time this visitor has been seen */
            visitor_is_new: boolean;
            /**
             * @description human, ai_bot, automation or search_crawler. Only answered to a secret key called directly; everyone else reads it on the server-side event read, webhooks and the dashboard. New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            visitor_kind?: "human" | "ai_bot" | "automation" | "search_crawler";
        };
        IdentifyTriggerOut: {
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            confidence?: "low" | "medium" | "high";
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            group?: "tor" | "ios_simulator" | "mitm_attack" | "frida_detected" | "virtual_machine" | "remote_control" | "datacenter_proxy" | "ip_blocklist" | "rooted_device" | "jailbroken_device" | "android_emulator" | "cloned_app" | "browser_tampering" | "fingerprint_suppressed" | "identity_obfuscated" | "developer_tools" | "device_farm" | "bot" | "ip_reputation" | "residential_proxy" | "privacy_settings" | "embedded_web_view" | "high_activity" | "location_spoofing" | "vpn" | "incognito_mode" | "active_call" | "attestation_missing" | "attestation_failed" | "device_inconsistent" | "report_incomplete" | "custom_root_ca" | "secondary_user_profile" | "network_anomaly";
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            signal: "incognito" | "tampering" | "antidetect_browser" | "automation" | "fetch_metadata_missing" | "web_ticket_missing" | "web_ticket_invalid" | "bad_bot" | "ai_spoofed" | "device_farm" | "high_activity" | "virtual_machine" | "fingerprint_suppressed" | "identity_obfuscated" | "embedded_web_view" | "privacy_settings" | "remote_control" | "developer_tools" | "geo_mismatch" | "device_inconsistent" | "report_incomplete" | "vpn_public" | "vpn_os_mismatch" | "vpn_relay" | "vpn_low_confidence" | "vpn_medium_confidence" | "vpn_high_confidence" | "tor" | "proxy" | "residential_proxy" | "residential_proxy_low_confidence" | "residential_proxy_medium_confidence" | "residential_proxy_high_confidence" | "ip_blocklist_email_spam" | "ip_blocklist_attack_source" | "ip_abuser" | "datacenter_ip" | "bogon_ip" | "anycast_ip" | "emulator" | "root_apps" | "app_cloner" | "play_device_integrity_failed" | "play_app_unrecognized" | "device_activity_high" | "device_activity_very_high" | "frida" | "mitm_attack" | "active_call" | "attestation_failed" | "attestation_missing" | "attestation_downgrade" | "probe_errors" | "custom_root_ca" | "secondary_user_profile" | "vpn_mobile" | "jailbreak" | "simulator" | "repeated_reinstall";
            /**
             * Format: int64
             * @description What this signal added to the score
             */
            weight?: number | null;
        };
        IngestIn: {
            /** @description Hardware attestation envelope bound to raw signals bytes (v3 native SDKs) */
            attest?: components["schemas"]["AttestEnvelope"] | null;
            /**
             * @description Native only, and only without attest: why the SDK sent no attestation. One of not_offered, unsupported, challenge_unavailable, key_error, timeout, backoff, install_unavailable. Diagnostic; it never lowers the score
             * @enum {string}
             */
            attest_skipped?: "not_offered" | "unsupported" | "challenge_unavailable" | "key_error" | "timeout" | "backoff" | "install_unavailable";
            /**
             * @description The SDK's consent state; must be granted, or the request is refused with consent_required
             * @enum {string}
             */
            consent?: "granted";
            /** @description Web only: session asks for next_seal with an identified answer, which the page keeps for the life of its tab and sends back as seal. Omitted, no seal is issued and the page keeps nothing */
            continuity?: string;
            /** @description Empty for a report. ticket asks for a web freshness ticket instead: a public key on the web only, with a body of v, op and sdk, answered 200 with ticket and expires_at, never charged */
            op?: string;
            /** @description Which SDK collected these signals */
            sdk?: components["schemas"]["SDKInfo"];
            /** @description Web only, with continuity session: the next_seal of the previous answer in this tab. One that does not verify is ignored */
            seal?: string;
            /** @description The platform-specific signals the SDK collected */
            signals?: {
                [key: string]: unknown;
            };
            /** @description An opaque value echoed back on the event and kept in long-lived rollups; never a personal identifier. A value holding a control character (U+0000 to U+001F, U+007F) is refused with invalid_request */
            tag?: string;
            /** @description Web only: the freshness ticket from a ticket request or the previous answer's next_ticket. A native report carrying one is refused with invalid_request */
            ticket?: string;
            /** @description Web only: the proof of work for a ticket whose answer carried pow_bits */
            ticket_pow?: string;
            /**
             * Format: int64
             * @description Wire envelope version. Must equal 3.
             */
            v?: number;
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
        PrivateAccessTokenIssuerIn: {
            /** @description Instead of token_key: the issuer's HTTPS directory, read for its current type 2 keys */
            directory_url?: string;
            /** @description The issuer's server name, host and optional port. Defaults to the directory URL's host */
            issuer_name?: string;
            /** @description The issuer's token type 2 key, base64url: a DER SubjectPublicKeyInfo of a 2048-bit RSASSA-PSS key with SHA-384 */
            token_key?: string;
        };
        PrivateAccessTokenIssuerOut: {
            directory_url?: string;
            issuer_name: string;
            /** @description base64url, padded */
            token_key?: string;
        };
        ProjectArchivedOut: {
            archived: boolean;
            id: string;
        };
        ProjectOut: {
            /** Format: date-time */
            created_at: string;
            id: string;
            name: string;
            organization_id: string;
            status: string;
        };
        ProjectPurgeOut: {
            /**
             * Format: date-time
             * @description When the last archived copy of the project's data, written before per-project archiving, expires; absent if the project never sent traffic
             */
            archive_copies_expire_by?: string | null;
            /** Format: date-time */
            completed_at?: string | null;
            id: string;
            /**
             * Format: date-time
             * @description When a pending pass runs next
             */
            next_attempt_at: string;
            /** @description first, ten minutes after the request, or sweep, a day after the first finished */
            pass: string;
            project_id: string;
            /** @description pending, then done */
            status: string;
        };
        ProjectPurgesOut: {
            purges: components["schemas"]["ProjectPurgeOut"][];
        };
        ProjectsOut: {
            projects: components["schemas"]["ProjectOut"][];
        };
        ProxyCredentialOut: {
            /** Format: date-time */
            created_at: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            environment: "production" | "staging" | "development";
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
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            platform: "web" | "android" | "ios";
            /** @description method or confidence */
            residential_proxy_weights_mode: string;
            /** Format: int64 */
            revision?: number;
            /** @description key, organization or default */
            scope: string;
            /** @description New values can be added within API v1, so accept values not listed here. */
            signals: ("incognito" | "tampering" | "antidetect_browser" | "automation" | "fetch_metadata_missing" | "web_ticket_missing" | "web_ticket_invalid" | "bad_bot" | "ai_spoofed" | "device_farm" | "high_activity" | "virtual_machine" | "fingerprint_suppressed" | "identity_obfuscated" | "embedded_web_view" | "privacy_settings" | "remote_control" | "developer_tools" | "geo_mismatch" | "device_inconsistent" | "report_incomplete" | "vpn_public" | "vpn_os_mismatch" | "vpn_relay" | "vpn_low_confidence" | "vpn_medium_confidence" | "vpn_high_confidence" | "tor" | "proxy" | "residential_proxy" | "residential_proxy_low_confidence" | "residential_proxy_medium_confidence" | "residential_proxy_high_confidence" | "ip_blocklist_email_spam" | "ip_blocklist_attack_source" | "ip_abuser" | "datacenter_ip" | "bogon_ip" | "anycast_ip" | "emulator" | "root_apps" | "app_cloner" | "play_device_integrity_failed" | "play_app_unrecognized" | "device_activity_high" | "device_activity_very_high" | "frida" | "mitm_attack" | "active_call" | "attestation_failed" | "attestation_missing" | "attestation_downgrade" | "probe_errors" | "custom_root_ca" | "secondary_user_profile" | "vpn_mobile" | "jailbreak" | "simulator" | "repeated_reinstall")[];
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
        SDKEventConsumeOut: {
            /**
             * Format: date-time
             * @description When it was consumed, RFC 3339
             */
            consumed_at: string;
            /** @description Always true: a later consume is answered 409 event_already_consumed */
            first: boolean;
            /** @description The event consumed */
            request_id: string;
        };
        SDKEventOut: {
            agent?: string;
            agent_version?: string;
            /** @description Present when visitor_kind is ai_bot: who operates the agent, what its traffic is for, and how far its claim was checked */
            ai?: components["schemas"]["AIAgentOut"] | null;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            anonymity_network?: "tor" | "relay" | "vpn" | "proxy" | "hosting";
            asn?: string;
            asn_name?: string;
            /**
             * Format: date-time
             * @description When the event was first consumed with POST /events/{request_id}/consume. Absent while it has not been
             */
            consumed_at?: string | null;
            country_code?: string;
            country_name?: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            device_kind?: "desktop" | "mobile" | "tablet" | "server";
            /** @description What Fingerly keeps of the submission, present when has_document is true: the schema, request id, time, SDK, IP network, the city-level IP answer, the risk score and triggers, attestation and the velocity decisions. Never the raw signals, the user agent or the address. Its contents are not a public contract. */
            document?: Record<string, never> | null;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            environment: "production" | "staging" | "development";
            has_document: boolean;
            /** @description The network the request came from: an IPv4 /24 or an IPv6 /40, such as 203.0.113.0/24 */
            ip_network?: string;
            occurred_at: string;
            origin?: string;
            os?: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            platform: "web" | "android" | "ios";
            /** @description The project the event belongs to */
            project_id?: string;
            /** @description Why enrichment did not happen, on an unavailable event */
            reason?: string;
            request_id: string;
            sdk_platform: string;
            sdk_version: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            state: "enriched" | "unavailable";
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            suspect_level?: "low" | "medium" | "high";
            /** Format: int32 */
            suspect_score?: number | null;
            tag?: string;
            triggers: components["schemas"]["EventTriggerOut"][];
            url_host?: string;
            url_path?: string;
            visitor_id: string;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            visitor_kind?: "human" | "ai_bot" | "automation" | "search_crawler";
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
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            environment: "production" | "staging" | "development";
            /** Format: date-time */
            expires_at?: string | null;
            /** @description Whether suspect_score and suspect_level are withheld from a browser, an app, a proxy and a hosted domain */
            hide_client_score: boolean;
            id: string;
            /** @description public or secret */
            kind: string;
            /** @description The tail of the credential, used when masking secret keys */
            last4: string;
            /**
             * Format: date-time
             * @description Written best-effort and batched
             */
            last_used_at?: string | null;
            name: string;
            /** @description The human-readable stem, such as fly_pk_production */
            prefix: string;
            /** @description Prototype: the project's token issuer, on the answer to an origins update */
            private_access_token_issuer?: components["schemas"]["PrivateAccessTokenIssuerOut"] | null;
            /** @description Prototype: whether a capable Safari is asked for a Private Access Token when the page requests a web ticket */
            private_access_tokens: boolean;
            project_id: string;
            /** @description Whether native reports without verified hardware attestation are refused */
            require_attestation: boolean;
            /** Format: date-time */
            revoked_at?: string | null;
            revoked_by?: string;
            /** @description active or revoked */
            status: string;
            /** @description Full publishable key for kind=public; always omitted for secret keys */
            value?: string;
            /**
             * Format: int64
             * @description Proof of work, in leading zero bits, the key's web freshness tickets ask for; 0 is none
             */
            web_ticket_pow_bits: number;
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
            /** @description New values can be added within API v1, so accept values not listed here. */
            platforms: ("web" | "android" | "ios")[];
        };
        SignalGroupOut: {
            description: string;
            /** @description New values can be added within API v1, so accept values not listed here. */
            inactive_on?: ("web" | "android" | "ios")[];
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            key: "tor" | "ios_simulator" | "mitm_attack" | "frida_detected" | "virtual_machine" | "remote_control" | "datacenter_proxy" | "ip_blocklist" | "rooted_device" | "jailbroken_device" | "android_emulator" | "cloned_app" | "browser_tampering" | "fingerprint_suppressed" | "identity_obfuscated" | "developer_tools" | "device_farm" | "bot" | "ip_reputation" | "residential_proxy" | "privacy_settings" | "embedded_web_view" | "high_activity" | "location_spoofing" | "vpn" | "incognito_mode" | "active_call" | "attestation_missing" | "attestation_failed" | "device_inconsistent" | "report_incomplete" | "custom_root_ca" | "secondary_user_profile" | "network_anomaly";
            label: string;
            /** @description New values can be added within API v1, so accept values not listed here. */
            platforms: ("web" | "android" | "ios")[];
            signals: components["schemas"]["SignalMemberOut"][];
            weights: {
                [key: string]: number;
            };
        };
        SignalMemberOut: {
            /** @description New values can be added within API v1, so accept values not listed here. */
            inactive_on?: ("web" | "android" | "ios")[];
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            signal: "incognito" | "tampering" | "antidetect_browser" | "automation" | "fetch_metadata_missing" | "web_ticket_missing" | "web_ticket_invalid" | "bad_bot" | "ai_spoofed" | "device_farm" | "high_activity" | "virtual_machine" | "fingerprint_suppressed" | "identity_obfuscated" | "embedded_web_view" | "privacy_settings" | "remote_control" | "developer_tools" | "geo_mismatch" | "device_inconsistent" | "report_incomplete" | "vpn_public" | "vpn_os_mismatch" | "vpn_relay" | "vpn_low_confidence" | "vpn_medium_confidence" | "vpn_high_confidence" | "tor" | "proxy" | "residential_proxy" | "residential_proxy_low_confidence" | "residential_proxy_medium_confidence" | "residential_proxy_high_confidence" | "ip_blocklist_email_spam" | "ip_blocklist_attack_source" | "ip_abuser" | "datacenter_ip" | "bogon_ip" | "anycast_ip" | "emulator" | "root_apps" | "app_cloner" | "play_device_integrity_failed" | "play_app_unrecognized" | "device_activity_high" | "device_activity_very_high" | "frida" | "mitm_attack" | "active_call" | "attestation_failed" | "attestation_missing" | "attestation_downgrade" | "probe_errors" | "custom_root_ca" | "secondary_user_profile" | "vpn_mobile" | "jailbreak" | "simulator" | "repeated_reinstall";
            weights: {
                [key: string]: number;
            };
        };
        UsageDayOut: {
            /**
             * Format: int64
             * @description How much of it was on a production key
             */
            billable: number;
            /** Format: int64 */
            billed_micros: number;
            /**
             * Format: int64
             * @description Everything that arrived, including what was refused
             */
            checks: number;
            /** Format: date-time */
            date: string;
            /**
             * Format: int64
             * @description Rate-limited or out of credit
             */
            rejected: number;
            settled: boolean;
            /**
             * Format: int64
             * @description Counted and never billed
             */
            test: number;
        };
        UsageKeyOut: {
            /** Format: int64 */
            billable: number;
            /** Format: int64 */
            billed_micros: number;
            /** Format: int64 */
            checks: number;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            environment: "production" | "staging" | "development";
            id: string;
            /** @description public or secret */
            kind?: string;
            last4?: string;
            /**
             * Format: date-time
             * @description Written best-effort and batched
             */
            last_used_at?: string | null;
            name?: string;
            prefix?: string;
            /** Format: int64 */
            rejected: number;
            status?: string;
        };
        UsageOut: {
            days: components["schemas"]["UsageDayOut"][];
            /** Format: date-time */
            from: string;
            keys: components["schemas"]["UsageKeyOut"][];
            /** Format: int64 */
            pending_checks: number;
            /** Format: int64 */
            pending_days: number;
            /** Format: int64 */
            pending_micros: number;
            /** Format: int64 */
            rate_per_check_micros: number;
            /** Format: int64 */
            rate_per_lookup_micros: number;
            /** Format: date-time */
            settled_through?: string | null;
            /** Format: date-time */
            to: string;
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
        WebSealOut: {
            /**
             * Format: date-time
             * @description When the seal stops being accepted, RFC 3339 UTC
             */
            expires_at: string;
            /** @description Unpadded base64url seal, sent as seal on the next report from this tab */
            seal: string;
        };
        WebTicketOut: {
            /**
             * Format: date-time
             * @description When the ticket stops being accepted, RFC 3339 UTC
             */
            expires_at: string;
            /**
             * Format: int64
             * @description Present when the key asks for proof of work: the leading zero bits ticket_pow must produce
             */
            pow_bits?: number;
            /** @description Unpadded base64url ticket, sent as ticket on the next report */
            ticket: string;
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
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            environment: "live" | "test";
            error?: string | null;
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            event: "identification.completed" | "identification.refused" | "visitor.suspect" | "billing.status_changed" | "usage.daily_settled" | "webhook.test";
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
            /**
             * @description New values can be added within API v1, so accept values not listed here.
             * @enum {string}
             */
            environment: "live" | "test";
            /** @description New values can be added within API v1, so accept values not listed here. */
            events: ("identification.completed" | "identification.refused" | "visitor.suspect" | "billing.status_changed" | "usage.daily_settled")[];
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
    reportRequestsYourServerServed: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AgentSightingsIn"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AgentSightingsOut"];
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
            /** @description The organization is suspended or closed */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `invalid_request`: no items or more than 200, a header over 4096 bytes, an address that is not one IP literal, or a count over 1000000 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `rate_limited`: over the key's, the address's or the organization's rate, or the organization's daily allowance (`Fingerly-RateLimit-Scope: daily`); retry after Retry-After */
            429: {
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
            /** @description Challenges are being requested faster than the key's, the address's or the organization's rate limit allows; retry after Retry-After */
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
                level?: "low" | "medium" | "high";
                /** @description human, ai_bot, automation or search_crawler */
                kind?: "human" | "ai_bot" | "automation" | "search_crawler";
                /** @description An AI agent's operator, exactly as events name it, such as OpenAI */
                ai_provider?: string;
                /** @description training, search, user_fetch or agent */
                ai_purpose?: "training" | "search" | "user_fetch" | "agent";
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
            /** @description The organization is suspended or closed */
            403: {
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
            /** @description The organization is suspended or closed */
            403: {
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
    markEventConsumedOnce: {
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
                    "application/json": components["schemas"]["SDKEventConsumeOut"];
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
            /** @description The organization is suspended or closed */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `event_not_found`: no event with that request ID in this key's environment, or it is older than 30 days. `event_pending`: the identification is still being recorded; retry after the `Retry-After` seconds */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `event_already_consumed`: consumed before; `details[0]` is `{"field": "consumed_at", "issue": "<RFC 3339>"}` */
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
            /** @description `events_unavailable`: retry after the `Retry-After` seconds */
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
    setDeviceDevicecheckBits: {
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
                    /** @description The value to set for the first bit. Leave out to keep it */
                    bit0?: boolean | null;
                    /** @description The value to set for the second bit. Leave out to keep it */
                    bit1?: boolean | null;
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
                    "application/json": components["schemas"]["DeviceCheckWriteOut"];
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
            /** @description The organization is suspended or closed */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `device_check_not_held`: no write token is held for that event */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `device_check_spent`: already used, or a retry that is not the first request; `device_check_busy` or `credential_unavailable` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `bits_required` or `apple_rejected` */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `device_check_unavailable`: retry within the hour */
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
    readDeviceDevicecheckBits: {
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
                    "application/json": components["schemas"]["DeviceCheckQueryOut"];
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
            /** @description The organization is suspended or closed */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `device_check_not_held`: no read token is held for that event */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `device_check_spent`: already used, or a retry that is not the first request; `device_check_busy` or `credential_unavailable` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `apple_rejected`: Apple rejected the token; `apple_status` says how */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description `device_check_unavailable`: retry within the hour */
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
            /** @description The Idempotency-Key was reused with a different payload, or the original request is still in progress */
            409: {
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
            /** @description The SDK key or the organization is over its rate limit; retry after Retry-After. A secret key called from a backend is also told which limit in Fingerly-RateLimit-Scope */
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
            /** @description The Idempotency-Key was reused with a different payload, or the original request is still in progress */
            409: {
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
            /** @description The SDK key or the organization is over its rate limit; retry after Retry-After. A secret key called from a backend is also told which limit in Fingerly-RateLimit-Scope */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
    listProjects: {
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
                    "application/json": components["schemas"]["ProjectsOut"];
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
    createProject: {
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
                    "application/json": components["schemas"]["ProjectOut"];
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
            /** @description Only an admin key may create a project */
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
            /** @description The name is taken, or the organization is at its project limit */
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
    archiveProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                organization_id: string;
                project_id: string;
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
                    "application/json": components["schemas"]["ProjectArchivedOut"];
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
            /** @description Only an admin key may archive a project */
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
    listProjectAppleAndGoogleCredentials: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the project belongs to */
                organization_id: string;
                /** @description The project the credentials are for */
                project_id: string;
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
                    "application/json": components["schemas"]["AttestationCredentialsOut"];
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
    uploadOrReplaceProjectAppleKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the project belongs to */
                organization_id: string;
                /** @description The project the credential is for */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Ask iOS apps for a DeviceCheck token and hold it for this project's backend for one hour. Defaults to false */
                    device_check_enabled?: boolean;
                    /** @description The 10-character ID of the key, as App Store Connect shows it */
                    key_id?: string;
                    /** @description The PEM contents of the .p8 file. The key must have DeviceCheck enabled. Never returned */
                    private_key?: string;
                    /** @description The 10-character Apple Team ID that owns the apps */
                    team_id?: string;
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
                    "application/json": components["schemas"]["AttestationCredentialOut"];
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The key or an identifier is not valid */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Credentials cannot be stored on this deployment */
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
    deleteProjectAppleKey: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the project belongs to */
                organization_id: string;
                /** @description The project the credentials are for */
                project_id: string;
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The project has no Apple credential */
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
    uploadOrReplaceProjectGoogleServiceAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the project belongs to */
                organization_id: string;
                /** @description The project the credential is for */
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * Format: int64
                     * @description The number of the Google Cloud project linked to the app in Play Console
                     */
                    cloud_project_number?: number;
                    /**
                     * Format: int64
                     * @description Play Integrity decodes Fingerly may spend per UTC day. Defaults to 4000, leaving the rest of Google's 10000 to your own use
                     */
                    daily_budget?: number | null;
                    /** @description The JSON key file of a service account in that project. Never returned */
                    service_account?: string;
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
                    "application/json": components["schemas"]["AttestationCredentialOut"];
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The service account or a field is not valid */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Credentials cannot be stored on this deployment */
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
    deleteProjectGoogleServiceAccount: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization the project belongs to */
                organization_id: string;
                /** @description The project the credentials are for */
                project_id: string;
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The project has no Google Play credential */
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
    eraseVisitorOfOneAppInstall: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization */
                organization_id: string;
                /** @description The project the app belongs to */
                project_id: string;
                /** @description ios or android */
                platform: "ios" | "android";
                /** @description The install identifier the Fingerly SDK stored in the app */
                install_id: string;
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
            /** @description No such project, or no visitor holds that install */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The platform is not ios or android */
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
    listProjectPurgePasses: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization */
                organization_id: string;
                /** @description The project */
                project_id: string;
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
                    "application/json": components["schemas"]["ProjectPurgesOut"];
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
            /** @description Only an admin key may purge a project */
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
    deleteAllOfProjectData: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The organization */
                organization_id: string;
                /** @description The project */
                project_id: string;
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
                    "application/json": components["schemas"]["ProjectPurgeOut"];
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
            /** @description Only an admin key may purge a project */
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
    readOneProjectMeteredTrafficPerDayAndPerKey: {
        parameters: {
            query?: {
                /** @description The project to report on */
                project_id?: string;
                /** @description First day, YYYY-MM-DD. Defaults to 30 days ago */
                from?: string;
                /** @description Last day, exclusive, YYYY-MM-DD. Defaults to tomorrow */
                to?: string;
                /** @description all, live or test */
                scope?: string;
            };
            header?: never;
            path: {
                /** @description The organization to report on */
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
                    "application/json": components["schemas"]["UsageOut"];
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
            /** @description Only an admin key may read usage */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description No such project */
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
            /** @description This deployment has no warehouse */
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
                    /**
                     * @description production, staging or development
                     * @enum {string}
                     */
                    environment?: "production" | "staging" | "development";
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
                platform: "web" | "android" | "ios";
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
                platform: "web" | "android" | "ios";
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
                    /** @description SHA-256 signing certificate digests, 64 hex characters (colon separators accepted). Required alongside allowed_android_packages in production or when require_attestation is true */
                    allowed_android_signers?: string[];
                    /** @description Apple app IDs: Team ID, a dot, then the bundle identifier */
                    allowed_apple_app_ids?: string[];
                    /** @description Scheme and host, no path. A public key names at least one origin, Android package or Apple app ID */
                    allowed_origins?: string[];
                    /**
                     * @description production, staging or development
                     * @enum {string}
                     */
                    environment?: "production" | "staging" | "development";
                    /** Format: date-time */
                    expires_at?: string | null;
                    /** @description Withhold suspect_score and suspect_level from a browser, an app, a proxy and a hosted domain. Defaults to true for a public key and false for a secret key */
                    hide_client_score?: boolean | null;
                    /** @description public or secret */
                    kind?: string;
                    /** @description What the key is called. The only part a person can recognise once the secret is masked */
                    name?: string;
                    /** @description Refuse native reports whose hardware attestation did not verify */
                    require_attestation?: boolean | null;
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
                    /** @description SHA-256 signing certificate digests, 64 hex characters (colon separators accepted). Required alongside allowed_android_packages in production or when require_attestation is true */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
                    /** @description Prototype: the token issuer of the key's whole project. Leave out to keep it; send an empty object to clear it */
                    private_access_token_issuer?: components["schemas"]["PrivateAccessTokenIssuerIn"] | null;
                    /** @description Prototype: ask Safari on iOS 16+ and macOS 13+ for a Private Access Token when the page requests a web ticket. Needs a public key in a project that names a token issuer. Leave out to keep the current setting */
                    private_access_tokens?: boolean | null;
                    /**
                     * Format: int64
                     * @description Proof of work the key's web freshness tickets ask for, 0 (off) to 22 leading zero bits. Leave out to keep the current setting
                     */
                    web_ticket_pow_bits?: number | null;
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
                platform: "web" | "android" | "ios";
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
                platform: "web" | "android" | "ios";
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
    readMeteredTrafficPerDayAndPerKey: {
        parameters: {
            query?: {
                /** @description The project to report on */
                project_id?: string;
                /** @description First day, YYYY-MM-DD. Defaults to 30 days ago */
                from?: string;
                /** @description Last day, exclusive, YYYY-MM-DD. Defaults to tomorrow */
                to?: string;
                /** @description all, live or test */
                scope?: string;
            };
            header?: never;
            path: {
                /** @description The organization to report on */
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
                    "application/json": components["schemas"]["UsageOut"];
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
            /** @description Only an admin key may read usage */
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
            /** @description This deployment has no warehouse */
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
                environment?: "all" | "live" | "test";
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
                    /** @enum {string} */
                    environment?: "live" | "test";
                    events?: ("identification.completed" | "identification.refused" | "visitor.suspect" | "billing.status_changed" | "usage.daily_settled")[];
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
                    /** @enum {string|null} */
                    environment?: "live" | "test" | null;
                    events?: ("identification.completed" | "identification.refused" | "visitor.suspect" | "billing.status_changed" | "usage.daily_settled")[] | null;
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
            /** @description The management key's role does not allow this, or its organization is suspended or closed */
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
