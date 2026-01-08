import { Layout } from "@/components/layout/Layout";
import { DeploymentAnalytics } from "@/components/DeploymentAnalytics";
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
  return (
    <Layout title="Deployment Overview">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <DeploymentAnalytics />
        </motion.div>
      </motion.div>
    </Layout>
  );
}
