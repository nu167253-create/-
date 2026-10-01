# Security Specification & Threat Model

## Data Invariants
1. A request document ID must be valid and cannot be altered once created.
2. Every request must contain a valid category, title, status, and creation timestamp.
3. Anyone can read request documents by request ID (for tracking status) or create new requests.
4. Updates to request status and approval steps can be performed by authorized users or officers.
5. System announcement banners can be read by public and updated by officers.

## "Dirty Dozen" Threat Payloads & Invariants
1. Spoofed User ID Injection: Injecting arbitrary user IDs in create payload.
2. Large String Denial-of-Wallet: Injecting 1MB strings in title or reason fields.
3. Path Injection Attack: Supplying invalid characters in document IDs.
4. Schema Mutation Attack: Injecting unauthorized top-level property keys.
5. Immutable Field Tampering: Changing `createdAt` or `id` on update.
6. Status Bypass: Overriding status to 'approved' without going through workflow.
7. Unauthenticated Admin Override: Modifying system announcement banner without credentials.
8. Orphaned Write Attack: Writing request sub-comments without valid parent request.
9. System Field Pollution: Setting system-generated timestamps to client local times.
10. Anonymous Bulk Deletion: Attempting to delete requests without proper permissions.
11. PII Harvesting: Unrestricted query scraping of applicant phone and citizen ID fields.
12. Camera Status Spoofing: Overriding CCTV network health monitor stats.
