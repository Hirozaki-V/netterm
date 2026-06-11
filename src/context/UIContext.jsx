/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';

export const UIContext = createContext();

export function UIProvider({ children }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTermKey, setSelectedTermKey] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [editDefModalOpen, setEditDefModalOpen] = useState(false);
  const [addConnModalOpen, setAddConnModalOpen] = useState(false);
  const [activeConnections, setActiveConnections] = useState(null);
  const [addConnectionCallback, setAddConnectionCallback] = useState(null);
  
  // Toast state
  const [toast, setToast] = useState(null);

  // Custom Modals
  const [customModal, setCustomModal] = useState(null);

  // Toast Notification System
  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Promisified Modals
  const showCustomConfirm = useCallback((title, message, options = {}) => {
    const isDanger = typeof options === 'boolean' ? options : !!options.isDanger;
    const confirmText = typeof options === 'object' ? options.confirmText : undefined;
    const cancelText = typeof options === 'object' ? options.cancelText : undefined;
    const thirdButtonText = typeof options === 'object' ? options.thirdButtonText : undefined;
    return new Promise((resolve) => {
      setCustomModal({
        type: 'confirm',
        title,
        message,
        isDanger,
        confirmText,
        cancelText,
        thirdButtonText,
        resolve
      });
    });
  }, []);

  const showCustomPrompt = useCallback((title, label, placeholder = '') => {
    return new Promise((resolve) => {
      setCustomModal({
        type: 'prompt',
        title,
        label,
        placeholder,
        resolve
      });
    });
  }, []);

  const handleModalConfirm = useCallback((value) => {
    if (customModal) {
      customModal.resolve(value);
      setCustomModal(null);
    }
  }, [customModal]);

  const handleModalCancel = useCallback(() => {
    if (customModal) {
      customModal.resolve(customModal.type === 'confirm' ? false : null);
      setCustomModal(null);
    }
  }, [customModal]);

  const value = useMemo(() => ({
    activeTab,
    setActiveTab,
    selectedTermKey,
    setSelectedTermKey,
    settingsOpen,
    setSettingsOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    editDefModalOpen,
    setEditDefModalOpen,
    addConnModalOpen,
    setAddConnModalOpen,
    activeConnections,
    setActiveConnections,
    addConnectionCallback,
    setAddConnectionCallback,
    toast,
    showToast,
    customModal,
    showCustomConfirm,
    showCustomPrompt,
    handleModalConfirm,
    handleModalCancel
  }), [
    activeTab,
    selectedTermKey,
    settingsOpen,
    mobileMenuOpen,
    mobileDrawerOpen,
    editDefModalOpen,
    addConnModalOpen,
    activeConnections,
    addConnectionCallback,
    toast,
    showToast,
    customModal,
    showCustomConfirm,
    showCustomPrompt,
    handleModalConfirm,
    handleModalCancel
  ]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}
