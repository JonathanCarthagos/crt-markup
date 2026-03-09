'use client';

import * as React from 'react';
import { Auth } from '@/components/ui/auth-form-1';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Quando true, esconde Google e mostra apenas Email/Senha (fluxo de convite) */
  emailOnly?: boolean;
  /** URL para redirecionar após confirmação de email (Sign Up no fluxo de convite) */
  emailRedirectTo?: string;
  /** Callback após login bem-sucedido (para processSilentJoin no editor) */
  onSuccess?: () => void | Promise<void>;
}

/**
 * Modal de autenticação para o fluxo de convite (Progressive Disclosure).
 * Usa Auth com emailOnly para exigir apenas Email/Senha.
 *
 * IMPORTANTE: onSuccess só dispara em login bem-sucedido, NÃO no clique do X.
 */
export function AuthModal({ isOpen, onClose, emailOnly = false, emailRedirectTo, onSuccess }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md">
        <Auth
          onClose={onClose}
          onAuthSuccess={onSuccess}
          onGoogleSignIn={async () => {}}
          emailOnly={emailOnly}
          emailRedirectTo={emailRedirectTo}
        />
      </div>
    </div>
  );
}
