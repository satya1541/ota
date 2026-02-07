import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface MotionWrapperProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export const MotionWrapper = ({ children, className, delay = 0 }: MotionWrapperProps) => {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{
                    duration: 0.4,
                    ease: "circOut", // Snappy eased animation
                    delay: delay,
                    type: "spring",
                    stiffness: 100,
                    damping: 10
                }}
                className={className}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export const GlitchWrapper = ({ children, className }: { children: ReactNode; className?: string }) => {
    return (
        <motion.div
            className={className}
            whileHover={{
                x: [0, -2, 2, -1, 1, 0],
                y: [0, 1, -1, 2, 0],
                transition: { duration: 0.2 }
            }}
        >
            {children}
        </motion.div>
    )
}
