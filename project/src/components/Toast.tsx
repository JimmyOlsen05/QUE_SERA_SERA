import React from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';

export const ToastContainer = () => {
  return <Toaster position="top-center" />;
};

export const toast = {
  success: (message: string) => hotToast.success(message),
  error: (message: string) => hotToast.error(message),
  loading: (message: string) => hotToast.loading(message),
};
