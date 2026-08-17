import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface AuthSession {
  id: string;
  username: string;
  name: string;
  role: "SUPER_ADMIN" | "FACILITATOR";
}

const AUTH_COOKIE_NAME = "finGame_admin_session";
const SECRET_KEY = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || "fin-game-secret-key-2026";

// Hash password with salt using PBKDF2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

// Verify password with stored salt:hash
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

// Create signature for session data
function signData(dataStr: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(dataStr).digest("hex");
}

// Set authenticated session in httpOnly cookie
export async function setAuthSession(session: AuthSession) {
  const cookieStore = await cookies();
  const dataStr = JSON.stringify(session);
  const sig = signData(dataStr);
  const token = Buffer.from(`${dataStr}|${sig}`).toString("base64");

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Keep legacy cookie for backward compatibility
  cookieStore.set("finGame_admin_authenticated", "true", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
}

// Get authenticated session from cookie
export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    // Fallback: Check if legacy cookie exists and return default super admin
    const legacyAuth = cookieStore.get("finGame_admin_authenticated")?.value;
    if (legacyAuth === "true") {
      const superAdmin = await getOrCreateSuperAdmin();
      return {
        id: superAdmin.id,
        username: superAdmin.username,
        name: superAdmin.name,
        role: "SUPER_ADMIN",
      };
    }
    return null;
  }

  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const [dataStr, sig] = raw.split("|");
    if (!dataStr || !sig) return null;

    const expectedSig = signData(dataStr);
    if (sig !== expectedSig) return null;

    const session: AuthSession = JSON.parse(dataStr);

    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, username: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  } catch (_) {
    return null;
  }
}

// Clear session cookie
export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete("finGame_admin_authenticated");
}

// Ensure default Super Admin exists in database
export async function getOrCreateSuperAdmin() {
  const defaultUsername = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const defaultPassword = (process.env.ADMIN_PASSWORD || "fingame2026").trim();

  let admin = await prisma.user.findUnique({
    where: { username: defaultUsername },
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        username: defaultUsername,
        name: "Super Administrador",
        email: "admin@fingame.com",
        passwordHash: hashPassword(defaultPassword),
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
  }

  return admin;
}

// Clone default template catalog to a newly created facilitator
export async function cloneDefaultCatalogForUser(userId: string) {
  try {
    // Get existing template or superadmin catalog items
    const templateExpenses = await prisma.expenseOption.findMany({
      where: { userId: null },
    });

    const expensesToClone = templateExpenses.length > 0
      ? templateExpenses
      : await prisma.expenseOption.findMany({ take: 50 });

    if (expensesToClone.length > 0) {
      for (const item of expensesToClone) {
        await prisma.expenseOption.create({
          data: {
            userId,
            title: item.title,
            cost: item.cost,
            happinessPoints: item.happinessPoints,
            type: item.type,
            category: item.category,
            description: item.description,
            isRPGChoice: item.isRPGChoice,
          },
        });
      }
    }

    const templateUnforeseen = await prisma.unforeseenEvent.findMany({
      where: { userId: null },
    });

    const unforeseenToClone = templateUnforeseen.length > 0
      ? templateUnforeseen
      : await prisma.unforeseenEvent.findMany({ take: 50 });

    if (unforeseenToClone.length > 0) {
      for (const item of unforeseenToClone) {
        await prisma.unforeseenEvent.create({
          data: {
            userId,
            title: item.title,
            description: item.description,
            costToFix: item.costToFix,
            penaltyIfNotFixedPoints: item.penaltyIfNotFixedPoints,
            restoredPointsIfFixed: item.restoredPointsIfFixed,
          },
        });
      }
    }
  } catch (err) {
    console.error("Erro ao clonar catálogo padrão para usuário:", err);
  }
}
