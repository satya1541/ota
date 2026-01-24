import { Layout } from "@/components/layout/Layout";
import { useTranslation } from "react-i18next";
import { Loader } from "@/components/loader";
import { lazy, Suspense } from "react";
const DeploymentAnalytics = lazy(() => import("@/components/DeploymentAnalytics").then(mod => ({ default: mod.DeploymentAnalytics })));
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Overview() {
  const { t } = useTranslation();
  return (
    <Layout title={t('overview.title')}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <Suspense fallback={<div className="h-64 flex items-center justify-center bg-card border border-border/50 rounded-3xl backdrop-blur-md shadow-xl"><Loader /></div>}>
            <DeploymentAnalytics />
          </Suspense>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
