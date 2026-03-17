# Company Management Contract (Sprint-1 Baseline)

## Objective
- Define company management ownership under Business App with role-safe operations.

## Scope in
- Company profile read/update contract.
- Company member role and status management contract.
- Transition from dashboard ownership to Business App ownership.

## Scope out
- No HR module expansion.
- No accounting policy changes.
- No procurement approval engine expansion.

## API Contract (v1)
- GET /api/company/profile
- PATCH /api/company/profile
- GET /api/company/members
- PATCH /api/company/members/:userId
- PATCH /api/company-management/profile
- POST /api/company-management/offers
- PATCH /api/company-management/offers/:offerId
- DELETE /api/company-management/offers/:offerId
- PATCH /api/company-management/membership-tiers/:tierId
- PATCH /api/company-management/redemptions/:redemptionId/decision

## Event Contract (v1)
- company.profile.updated
- company.member.role_changed
- company.member.status_changed
- company.offer.created
- company.offer.updated
- company.offer.deleted
- company.redemption.approved
- company.redemption.rejected

## Access Rules
- Only owner/admin/manager roles can mutate company management write paths.
- Read and write scope is restricted by `profiles.business_active_company_id` on server-side APIs.
- Business write APIs must fail-close with 403 when request scope mismatches active company context.

## Backward Compatibility
- Legacy dashboard management route redirects to Business App path.
- No data model compatibility break in Sprint-1.
- Existing payload `company_id` is accepted for compatibility but cannot override active-company server scope.

## Risks and mitigations
- Risk: role mapping mismatch after route ownership shift.
- Mitigation: keep role check matrix and smoke tests for owner/admin/manager/staff.

## Acceptance checklist
- API and event contracts are documented.
- Role and tenant scope rules are documented.
- Redirect and compatibility behavior are documented.
