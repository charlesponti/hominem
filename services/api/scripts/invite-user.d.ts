/**
 * Creates a dev collection invite for a user by email.
 *
 * Usage: pnpm invite-user --email <user email>
 *
 * Set DEV_INVITE_OWNER_EMAIL to pick the collection owner - otherwise it just
 * grabs the first dev collection that has one.
 */
import 'dotenv/config';
