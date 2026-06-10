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
  const showCustomConfirm = useCallback((title, message, isDanger = false) => {
    return new Promise((resolve) => {
      setCustomModal({
        type: 'confirm',
        title,
        message,
        isDanger,
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
