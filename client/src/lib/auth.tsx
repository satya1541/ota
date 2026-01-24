import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser {
    id: string;
    username: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    isLoading: boolean;
    login: (username: string, pin: string) => Promise<boolean>; // Keeping signature for now to minimize refactor noise, but username is unused
    register: (username: string, pin: string) => Promise<boolean>;
    forgotPassword: (username: string) => Promise<boolean>; // No-op for compatibility
    resetPassword: (pin: string, token: string) => Promise<boolean>; // No-op for compatibility
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "/api/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedAuth = localStorage.getItem("ota_auth");
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                setIsAuthenticated(true);
                setUser(authData.user);
            } catch {
                localStorage.removeItem("ota_auth");
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (_username: string, pin: string): Promise<boolean> => {
        // Username is deprecated but kept in signature for compatibility if needed, or we can just ignore it
        // actually let's update strict to PIN only as per plan
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            setIsAuthenticated(true);
            setUser(data.user);
            localStorage.setItem("ota_auth", JSON.stringify({ user: data.user }));
            return true;
        } catch (error: any) {
            throw error;
        }
    };

    const register = async (_username: string, pin: string): Promise<boolean> => {
        // Username is ignored/auto-generated on backend now
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Registration failed");
            }

            return true;
        } catch (error: any) {
            throw error;
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("ota_auth");
    };

    const forgotPassword = async (_username: string): Promise<boolean> => {
        console.warn("forgotPassword is not implemented in PIN-only mode");
        return true;
    };

    const resetPassword = async (_pin: string, _token: string): Promise<boolean> => {
        console.warn("resetPassword is not implemented in PIN-only mode");
        return true;
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            user,
            isLoading,
            login,
            register,
            forgotPassword,
            resetPassword,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
