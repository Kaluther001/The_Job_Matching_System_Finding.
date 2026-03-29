import React from 'react';
import { motion } from 'motion/react';

export default function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <motion.div
        className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-xs font-bold text-black uppercase tracking-widest">Loading</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="flex justify-center py-20">{content}</div>;
}
