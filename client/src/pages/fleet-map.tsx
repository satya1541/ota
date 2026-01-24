import { Layout } from "@/components/layout/Layout";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { deviceApi, Device } from "@/lib/api";
import { Loader } from "@/components/loader";
import { lazy, Suspense } from "react";
const LeafletDeviceMap = lazy(() => import("@/components/LeafletDeviceMap").then(mod => ({ default: mod.LeafletDeviceMap })));
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

export default function FleetMap() {
  const { t } = useTranslation();
  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: deviceApi.getAll,
  });

  if (isLoading) {
    return (
      <Layout title={t('fleet_map.title')}>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t('fleet_map.title')}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={item}>
          <Suspense fallback={<div className="h-[500px] flex items-center justify-center glassmorphism rounded-3xl border border-white/10"><Loader /></div>}>
            <LeafletDeviceMap devices={devices} />
          </Suspense>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
