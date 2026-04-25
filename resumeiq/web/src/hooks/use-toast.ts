import { toast as sonnerToast } from "sonner";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const { title, description, variant } = options;

    if (variant === "destructive") {
      sonnerToast.error(title, {
        description: description,
      });
    } else {
      sonnerToast.success(title, {
        description: description,
      });
    }
  };

  return { toast };
}
