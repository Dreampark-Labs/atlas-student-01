"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface TabTransitionProps {
  children: ReactNode;
  tabKey: string;
  className?: string;
}

export const TabTransition = ({ children, tabKey, className = "" }: TabTransitionProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export const TabFadeTransition = ({ children, tabKey, className = "" }: TabTransitionProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.15,
          ease: "easeInOut",
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

interface AnimatedTabsProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedTabs = ({ children, className = "" }: AnimatedTabsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
