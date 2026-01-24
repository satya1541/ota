import type { Express, Request, Response } from "express";
import { storage } from "./storage";
// Simple auth routes
export function registerAuthRoutes(app: Express) {
    // Login and Register routes are handled in server/routes.ts with proper PIN-only validation

    // ==================== GET CURRENT USER ====================
    app.get("/api/auth/me", async (req: Request, res: Response) => {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        try {
            const user = await storage.getUserById(userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json({
                user: { id: user.id, username: user.username },
            });
        } catch (error) {
            res.status(500).json({ error: "Failed to get user" });
        }
    });
}
