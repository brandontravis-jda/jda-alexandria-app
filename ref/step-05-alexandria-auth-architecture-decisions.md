# Alexandria Auth Architecture — Decision Summary
**Date:** April 1, 2026  
**Context:** Post Step-5 auth review, strategic architecture discussion

---

## What We Identified

The Step 5 auth review surfaced five issues, but the deeper problem underneath all of them is architectural: **Azure AD is the root of trust for Alexandria's identity model.** That inversion creates a structural dependency that causes the specific bugs in the review and also limits the platform's future.

The five issues are real and should be fixed. But fixing them without addressing the underlying model would leave the foundation wrong.

---

## The Core Problem

Alexandria was built with Azure AD as the authoritative source for user identity, tier, and (indirectly) permissions. This is the opposite of how SSO is supposed to work in a well-architected application.

In a sound model, the application owns its identity layer. SSO is a configured integration the app admin sets up, not a structural prerequisite. Azure answers "who are you" — the app decides "what can you do."

The current model also has a bootstrapping problem: the Owner account exists because Brandon is in an Azure group. If that Azure dependency were ever removed, reconfigured, or extended to another organization, there is no owner account that predates the IdP. The app has no root of trust of its own.

---

## Where We Landed

### Single Azure group for access control

Collapse all Azure groups down to one. If you are in the group, you can authenticate. That is all Azure does. It answers one question: are you a valid JDA user? Nothing more.

Role assignment, permission management, and tier designation move entirely into the app.

### DB-seeded Owner account

An Owner account is seeded at deploy time, bound to an org-level identity (not a personal account). This account is JDA's asset, not any individual's. It predates and supersedes SSO configuration.

On first setup, the current admin links their Azure AD identity to the Owner account. They authenticate via SSO from that point forward, but the underlying account belongs to the org. If that person leaves, the Owner account can be relinked to a new identity by someone with DB access. The company is never locked out.

This is standard enterprise SaaS infrastructure security. The Owner account must not be exclusively tied to a personal identity.

### SSO links to the Owner account, not the other way around

The Owner account is not created by SSO. SSO is configured by the Owner after the fact and linked to the existing account. This keeps the app's root of trust independent of any IdP state.

### All permissions and roles managed in-app

No permission or role decisions are made based on Azure group membership. The permissions matrix (roles, permissions, user_roles) is the single source of truth for what any user can do. The portal UI is the single place an admin manages access.

One place to provision a user. One place to reason about what they can do.

---

## What This Fixes

**All five issues from the Step 5 review** are resolved by this model:

- `users.tier` freezing after first insert is irrelevant — tier is owned by the app, not synced from Azure
- `requireAdmin()` checking a stale DB tier is replaced by permission-based gating throughout
- Owner and Admin being indistinguishable is resolved — Owner is a distinct account type, not an Azure group mapping
- Portal access and user management permissions are decoupled through the roles model
- Dead code cleanup is a small PR regardless

**The deeper structural problems** are also addressed:

- Azure is no longer load-bearing for capability decisions
- The Owner account cannot be revoked by anyone inside the app
- No individual's departure can lock the org out of the platform
- The identity model is self-contained and could be extended or forked without Azure as a prerequisite

---

## What This Does Not Do

This is not a multi-tenancy refactor. Alexandria remains a single-tenant internal platform. This decision intentionally stops short of that.

The Granary precedent applies here: build the single-tenant version cleanly, freeze it when stable, fork when and if the product warrants it. The goal of this refactor is to stop making architectural assumptions that would make that future fork harder — not to prematurely build infrastructure for a use case that isn't committed.

---

## Recommended Next Steps for Cursor

1. Collapse Azure groups to a single access group
2. Seed an Owner account at the DB level bound to an org identity
3. Build an SSO-linking mechanism so the Owner can connect their Azure identity to the seeded account
4. Add an explicit code-level guard: the Owner account cannot be modified through any portal API route
5. Move all tier/role assignment into the app; remove Azure group membership as a role signal
6. Refactor `requireAdmin()` and all permission gates to use the permissions matrix exclusively
7. Validate with `alexandria_whoami` before proceeding to further steps

---

*This document reflects architectural decisions made April 1, 2026. Specific DB migration design is deferred to Cursor implementation.*
