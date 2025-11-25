import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { changePin } from '../services/userService';
import { useAuthStore } from '../stores/authStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandMark } from '../components/BrandMark';
import {
  createTenantUser,
  fetchTenantUsers,
  resetTenantUserPin,
  updateTenantUser,
  deleteTenantUser,
  TenantUser,
} from '../services/userManagementService';
import {
  PaymentSettingsService,
  PaymentSettings,
  UpdatePaymentSettingsRequest,
} from '../services/paymentSettingsService';
import { receiptService, Printer } from '../services/receiptService';
import { useScannerDeviceStore } from '../stores/scannerDeviceStore';
import { fetchRegisteredDevices } from '../services/scannerDeviceService';
import axios from 'axios';
import { API_URL } from '../config';
import { format } from 'date-fns';

function SectionContainer({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
      <header className="mb-4 space-y-1">
        <h2 className="theme-text-primary text-xl font-semibold">{title}</h2>
        {description && <p className="theme-text-secondary text-sm">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { user, tenant, accessToken } = useAuthStore((state) => ({
    user: state.user,
    tenant: state.tenant,
    accessToken: state.accessToken,
  }));
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'cashier',
    locationId: '',
    pin: '',
  });
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [monnifyForm, setMonnifyForm] = useState({
    apiKey: '',
    secretKey: '',
    contractCode: '',
    webhookSecret: '',
    enabled: false,
  });
  const [printProxyUrl, setPrintProxyUrl] = useState(
    localStorage.getItem('printProxyUrl') || import.meta.env.VITE_PRINT_PROXY_URL || 'ws://localhost:8080'
  );
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [printerForm, setPrinterForm] = useState({
    id: 'default-printer',
    type: 'serial' as 'serial' | 'network',
    path: '',
    host: '',
    port: '9100',
    baudRate: '9600',
  });
  const [registeringPrinter, setRegisteringPrinter] = useState(false);
  const [printerAvailable, setPrinterAvailable] = useState<boolean | null>(null);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; address?: string; timezone?: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(user?.locationId || '');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  const { devices: scannerDevices, removeDevice: removeScannerDevice } = useScannerDeviceStore();
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [registeredDevices, setRegisteredDevices] = useState<Array<{
    id: string;
    name: string;
    type: 'usb' | 'bluetooth' | 'camera';
    connectedAt: Date;
    lastUsedAt: Date;
    isActive: boolean;
  }>>([]);

  const isTenantAdmin = useMemo(() => user?.role === 'admin' || user?.isPlatformAdmin, [user?.role, user?.isPlatformAdmin]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!isTenantAdmin) {
        return;
      }
      setUsersLoading(true);
      try {
        const data = await fetchTenantUsers();
        setTenantUsers(data);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Unable to load users');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [isTenantAdmin]);

  useEffect(() => {
    const loadPaymentSettings = async () => {
      if (!isTenantAdmin) {
        return;
      }
      setLoadingPaymentSettings(true);
      try {
        const settings = await PaymentSettingsService.getPaymentSettings();
        setPaymentSettings(settings);
        setMonnifyForm({
          apiKey: settings.monnifyApiKey || '',
          secretKey: settings.monnifySecretKey || '',
          contractCode: settings.monnifyContractCode || '',
          webhookSecret: settings.monnifyWebhookSecret || '',
          enabled: settings.monnifyEnabled || false,
        });
      } catch (error: any) {
        console.error('Failed to load payment settings:', error);
        // Don't show error toast, just use defaults
        setPaymentSettings({ monnifyEnabled: false });
      } finally {
        setLoadingPaymentSettings(false);
      }
    };

    loadPaymentSettings();
  }, [isTenantAdmin]);

  useEffect(() => {
    let cancelled = false;
    const loadLocations = async () => {
      if (!accessToken) return;
      setLoadingLocations(true);
      try {
        const response = await axios.get(`${API_URL}/api/v1/locations`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 8000, // 8 second timeout
        });
        if (!cancelled) {
          setLocations(response.data || []);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error('Failed to load locations:', error);
          // Don't show error toast for locations - it's not critical
          // Just set empty array so UI doesn't break
          setLocations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingLocations(false);
        }
      }
    };
    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    setSelectedLocationId(user?.locationId || '');
  }, [user?.locationId]);

  useEffect(() => {
    if (!isTenantAdmin) {
      setRegisteredDevices([]);
      return;
    }
    const loadDevices = async () => {
      if (!accessToken) return;
      setLoadingDevices(true);
      try {
        const devices = await fetchRegisteredDevices(user?.locationId);
        setRegisteredDevices(devices);
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        setLoadingDevices(false);
      }
    };
    loadDevices();
  }, [accessToken, user?.locationId, isTenantAdmin]);

  const handleUpdateLocation = async () => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }
    setUpdatingLocation(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/users/me/location`,
        { locationId: selectedLocationId || undefined },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success('Location updated successfully');
      // Update auth store - refresh user data to get updated locationId
      // The user will need to refresh or the next login will have the updated locationId
      // For now, we'll update the local state
      if (user) {
        useAuthStore.setState({ user: { ...user, locationId: selectedLocationId || undefined } });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !locationForm.name.trim()) {
      toast.error('Location name is required');
      return;
    }
    setCreatingLocation(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/locations`,
        {
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || undefined,
          timezone: locationForm.timezone,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success(`Location "${locationForm.name}" created successfully`);
      setLocationForm({ name: '', address: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
      // Reload locations
      const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLocations(locationsResponse.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create location');
    } finally {
      setCreatingLocation(false);
    }
  };

  const handleUpdateLocationDetails = async (locationId: string) => {
    if (!accessToken || !locationForm.name.trim()) {
      toast.error('Location name is required');
      return;
    }
    setCreatingLocation(true);
    try {
      await axios.patch(
        `${API_URL}/api/v1/locations/${locationId}`,
        {
          name: locationForm.name.trim(),
          address: locationForm.address.trim() || undefined,
          timezone: locationForm.timezone,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      toast.success('Location updated successfully');
      setEditingLocation(null);
      setLocationForm({ name: '', address: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
      // Reload locations
      const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLocations(locationsResponse.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update location');
    } finally {
      setCreatingLocation(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }
    try {
      await axios.delete(`${API_URL}/api/v1/locations/${locationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      toast.success('Location deleted successfully');
      // Reload locations
      const locationsResponse = await axios.get(`${API_URL}/api/v1/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLocations(locationsResponse.data || []);
      // If deleted location was selected, clear selection
      if (selectedLocationId === locationId) {
        setSelectedLocationId('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete location');
    }
  };

  const startEditingLocation = (location: { id: string; name: string; address?: string; timezone?: string }) => {
    setEditingLocation(location.id);
    setLocationForm({
      name: location.name,
      address: location.address || '',
      timezone: location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
  };

  const cancelEditingLocation = () => {
    setEditingLocation(null);
    setLocationForm({ name: '', address: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' });
  };

  useEffect(() => {
    if (!isTenantAdmin) {
      setPrinterAvailable(null);
      return;
    }
    const checkPrinterStatus = async () => {
      try {
        // Use a timeout to prevent hanging
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 3000); // 3 second timeout
        });
        
        const availablePromise = receiptService.isAvailable().catch(() => false);
        const available = await Promise.race([availablePromise, timeoutPromise]);
        
        setPrinterAvailable(available);
        if (available) {
          loadPrinters();
        }
      } catch {
        // Silently handle - print proxy may not be running
        setPrinterAvailable(false);
      }
    };
    checkPrinterStatus();
  }, [printProxyUrl, isTenantAdmin]);

  const loadPrinters = async () => {
    if (!isTenantAdmin) {
      return;
    }
    setLoadingPrinters(true);
    try {
      const printerList = await receiptService.listPrinters();
      setPrinters(printerList);
    } catch (error) {
      console.error('Failed to load printers:', error);
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleSavePrintProxyUrl = () => {
    if (!isTenantAdmin) return;
    localStorage.setItem('printProxyUrl', printProxyUrl);
    toast.success('Print proxy URL saved. Reconnecting...');
    receiptService.disconnect();
    setTimeout(() => {
      receiptService.isAvailable().then(setPrinterAvailable).catch(() => setPrinterAvailable(false));
    }, 1000);
  };

  const handleRegisterPrinter = async (e: React.FormEvent) => {
    if (!isTenantAdmin) return;
    e.preventDefault();
    setRegisteringPrinter(true);
    try {
      const config: Printer['config'] = {};
      if (printerForm.type === 'serial') {
        if (!printerForm.path) {
          toast.error('Please enter printer path (e.g., COM3 on Windows, /dev/ttyUSB0 on Linux)');
          return;
        }
        config.path = printerForm.path;
        config.baudRate = parseInt(printerForm.baudRate, 10);
      } else {
        if (!printerForm.host) {
          toast.error('Please enter printer host/IP address');
          return;
        }
        config.host = printerForm.host;
        config.port = parseInt(printerForm.port, 10);
      }

      const success = await receiptService.registerPrinter(
        printerForm.id,
        printerForm.type,
        config
      );

      if (success) {
        toast.success(`Printer "${printerForm.id}" registered successfully`);
        setPrinterForm({
          id: 'default-printer',
          type: 'serial',
          path: '',
          host: '',
          port: '9100',
          baudRate: '9600',
        });
        await loadPrinters();
      } else {
        toast.error('Failed to register printer. Check print proxy connection.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to register printer');
    } finally {
      setRegisteringPrinter(false);
    }
  };
  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setCreatingUser(true);
    try {
      const response = await createTenantUser({
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role,
        locationId: userForm.locationId || undefined,
        pin: userForm.pin || undefined,
      });
      setTenantUsers((prev) => [response.user, ...prev]);
      toast.success(
        response.temporaryPin
          ? `User ${response.user.name} created. Temporary PIN: ${response.temporaryPin}`
          : `User ${response.user.name} created`,
      );
      setUserForm({
        name: '',
        email: '',
        role: 'cashier',
        locationId: '',
        pin: '',
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetPin = async (tenantUser: TenantUser) => {
    const newPinValue = Math.floor(Math.random() * 900000 + 100000).toString().slice(0, 6);
    try {
      await resetTenantUserPin(tenantUser.id, newPinValue);
      toast.success(`New PIN for ${tenantUser.name}: ${newPinValue}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to reset PIN');
    }
  };

  const handleChangeUserRole = async (tenantUser: TenantUser, newRole: string) => {
    if (tenantUser.role === newRole) return;
    try {
      const updated = await updateTenantUser(tenantUser.id, { role: newRole });
      setTenantUsers((prev) => prev.map((u) => (u.id === tenantUser.id ? updated : u)));
      toast.success(`Updated ${tenantUser.name} to ${newRole}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update role');
    }
  };

  const handleDeleteUser = async (tenantUser: TenantUser) => {
    if (!window.confirm(`Delete user ${tenantUser.name}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteTenantUser(tenantUser.id);
      setTenantUsers((prev) => prev.filter((u) => u.id !== tenantUser.id));
      toast.success(`Deleted user ${tenantUser.name}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to delete user');
    }
  };

  const handleChangeUserLocation = async (tenantUser: TenantUser, locationId: string | undefined) => {
    if (tenantUser.locationId === locationId) return;
    try {
      const updated = await updateTenantUser(tenantUser.id, { locationId });
      setTenantUsers((prev) => prev.map((u) => (u.id === tenantUser.id ? updated : u)));
      toast.success(`Updated ${tenantUser.name}'s location`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update location');
    }
  };


  const handleChangePin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Fill in all fields');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('New PIN and confirmation do not match');
      return;
    }
    if (newPin.length < 4 || newPin.length > 64) {
      toast.error('PIN must be between 4 and 64 characters');
      return;
    }

    try {
      setIsUpdatingPin(true);
      await changePin({ currentPin, newPin });
      toast.success('PIN updated');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update PIN');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  return (
    <div className="theme-background min-h-screen">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex items-start gap-4">
          <BrandMark
            size={56}
            backgroundClassName="bg-white/90 dark:bg-white/10"
            className="ring-1 ring-slate-200/40 dark:ring-white/10"
          />
          <div className="space-y-2">
            <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="theme-text-secondary text-sm">
              Manage your account, company profile, and workspace preferences.
            </p>
          </div>
        </div>

        {isTenantAdmin && (
          <SectionContainer
            title="Location Management"
            description="Create and manage store locations. Users can be assigned to specific locations."
          >
            <div className="space-y-6">
              {/* Create/Edit Location Form */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="theme-text-primary mb-4 text-sm font-semibold">
                  {editingLocation ? 'Edit Location' : 'Create New Location'}
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editingLocation) {
                      handleUpdateLocationDetails(editingLocation);
                    } else {
                      handleCreateLocation(e);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="theme-text-secondary mb-2 block text-xs font-medium">
                        Location Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                        placeholder="e.g., Main Store, Downtown Branch"
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="theme-text-secondary mb-2 block text-xs font-medium">Timezone</label>
                      <input
                        type="text"
                        value={locationForm.timezone}
                        onChange={(e) => setLocationForm({ ...locationForm, timezone: e.target.value })}
                        placeholder="UTC"
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="theme-text-secondary mb-2 block text-xs font-medium">Address</label>
                    <textarea
                      value={locationForm.address}
                      onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                      placeholder="Street address, city, state, zip code"
                      rows={2}
                      className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={creatingLocation || !locationForm.name.trim()}
                      className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingLocation ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
                    </button>
                    {editingLocation && (
                      <button
                        type="button"
                        onClick={cancelEditingLocation}
                        className="theme-chip rounded-full border px-6 py-2 text-sm font-semibold transition hover:border-sky-400"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Locations List */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="theme-text-primary mb-4 text-sm font-semibold">All Locations</h3>
                {loadingLocations ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                    <p className="theme-text-secondary mt-2 text-sm">Loading locations...</p>
                  </div>
                ) : locations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="theme-text-secondary text-sm">No locations created yet. Create your first location above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex-1">
                          <p className="theme-text-primary text-sm font-semibold">{location.name}</p>
                          {location.address && (
                            <p className="theme-text-secondary text-xs mt-1">{location.address}</p>
                          )}
                          <p className="theme-text-secondary text-xs mt-1">
                            Timezone: {location.timezone || 'UTC'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditingLocation(location)}
                            disabled={editingLocation === location.id}
                            className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(location.id)}
                            className="theme-chip rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionContainer>
        )}

        {!isTenantAdmin && (
          <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 backdrop-blur-xl">
            <h2 className="theme-text-primary text-lg font-semibold">Limited access</h2>
            <p className="theme-text-secondary text-sm mt-1">
              You're signed in as staff. Company-wide settings (locations, user management, payment gateway, and device controls) are only available to tenant administrators.
              Please contact an admin if you need something changed.
            </p>
          </div>
        )}

        <SectionContainer
          title="My Location"
          description="Set your location for checkout. This is required to process orders."
        >
          <div className="space-y-4">
            {loadingLocations ? (
              <div className="text-center py-8">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                <p className="theme-text-secondary mt-2 text-sm">Loading locations...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="theme-text-primary text-sm font-semibold text-amber-400 mb-2">
                  ⚠️ No Locations Available
                </p>
                <p className="theme-text-secondary text-xs">
                  No locations have been created for your tenant. Please contact your administrator to create a location.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="theme-text-primary mb-2 block text-sm font-medium">
                    Select Location
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                  >
                    <option value="">-- No Location Selected --</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} {location.address ? `(${location.address})` : ''}
                      </option>
                    ))}
                  </select>
                  {!user?.locationId && (
                    <p className="theme-text-secondary mt-2 text-xs text-amber-400">
                      ⚠️ Location is required to process orders. Please select a location.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleUpdateLocation}
                  disabled={updatingLocation || selectedLocationId === (user?.locationId || '')}
                  className="w-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingLocation ? 'Updating...' : 'Save Location'}
                </button>
                {user?.locationId && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="theme-text-primary text-sm font-semibold text-emerald-400">
                      ✓ Current Location: {locations.find(l => l.id === user.locationId)?.name || user.locationId}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </SectionContainer>

        <SectionContainer
          title="Security"
          description="Keep your point-of-sale secure by rotating staff PINs regularly."
        >
          <form className="space-y-4" onSubmit={handleChangePin}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="current-pin" className="theme-text-secondary text-sm font-medium">
                  Current PIN
                </label>
                <input
                  id="current-pin"
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                  maxLength={64}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="new-pin" className="theme-text-secondary text-sm font-medium">
                  New PIN
                </label>
                <input
                  id="new-pin"
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                  maxLength={64}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="confirm-pin" className="theme-text-secondary text-sm font-medium">
                  Confirm PIN
                </label>
                <input
                  id="confirm-pin"
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="theme-surface rounded-2xl border px-4 py-3 text-center text-lg outline-none focus:ring-2 focus:ring-sky-400"
                  maxLength={64}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isUpdatingPin}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-[0_25px_45px_-30px_rgba(16,185,129,0.65)] transition hover:shadow-[0_30px_60px_-35px_rgba(16,185,129,0.8)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingPin ? 'Updating...' : 'Update PIN'}
            </button>
          </form>
        </SectionContainer>

        <SectionContainer
          title="Company profile"
          description="Customize how your company appears across receipts, reports, and internal dashboards."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="company-name" className="theme-text-secondary text-sm font-medium">
                Company name
              </label>
              <input
                id="company-name"
                type="text"
                value={tenant?.name ?? ''}
                placeholder="Your company name"
                className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                disabled
              />
              <p className="theme-text-secondary text-xs">
                Slug: <span className="theme-text-primary font-medium lowercase">{tenant?.slug ?? 'n/a'}</span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="theme-text-secondary text-sm font-medium">Subscription plan</label>
              <div className="theme-surface rounded-2xl border px-4 py-3">
                <p className="theme-text-primary text-sm font-semibold capitalize">
                  {tenant?.plan ?? 'unassigned'} plan
                </p>
                <div className="theme-text-secondary mt-1 text-xs space-y-1">
                  <p>
                    Status:{' '}
                    <span className="theme-text-primary font-semibold capitalize">
                      {tenant?.status ?? 'pending'}
                    </span>
                  </p>
                  <p>
                    Seats:{' '}
                    <span className="theme-text-primary font-semibold">
                      {tenant?.seatLimit !== undefined ? tenant.seatLimit : 'unlimited'}
                    </span>
                  </p>
                  {tenant?.billingCycleStart && tenant?.billingCycleEnd && (
                    <p>
                      Cycle:{' '}
                      <span className="theme-text-primary font-medium">
                        {new Date(tenant.billingCycleStart).toLocaleDateString()} —{' '}
                        {new Date(tenant.billingCycleEnd).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  <p>Licensing management will be enabled soon.</p>
                </div>
              </div>
            </div>
          </div>
        </SectionContainer>

        {isTenantAdmin && (
          <SectionContainer
            title="User management"
            description="Invite new team members and maintain access across the company."
          >
            <div className="grid gap-6 xl:grid-cols-[2fr,3fr]">
              <form className="space-y-3" onSubmit={handleCreateUser}>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-name">
                    Full name
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-email">
                    Email
                  </label>
                  <input
                    id="user-email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-role">
                    Role
                  </label>
                  <select
                    id="user-role"
                    value={userForm.role}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-location">
                    Location (optional)
                  </label>
                  <select
                    id="user-location"
                    value={userForm.locationId}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, locationId: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="">-- No Location --</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} {location.address ? `(${location.address})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="theme-text-secondary text-sm font-medium" htmlFor="user-pin">
                    Initial PIN (optional)
                  </label>
                  <input
                    id="user-pin"
                    type="text"
                    value={userForm.pin}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, pin: e.target.value }))}
                    className="theme-surface rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Optional passphrase (4-64 characters)"
                    maxLength={64}
                  />
                  <p className="theme-text-secondary text-xs">
                    Leave blank to auto-generate a temporary numeric PIN, or enter a custom passphrase (4–64 characters) and share it securely.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-30px_rgba(37,99,235,0.65)] transition hover:shadow-[0_25px_60px_-30px_rgba(37,99,235,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingUser ? 'Adding user…' : 'Add user'}
                </button>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="theme-text-primary text-sm font-semibold">Team members</h3>
                  {usersLoading && <span className="theme-text-secondary text-xs">Loading…</span>}
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="theme-surface text-xs uppercase tracking-[0.2em] theme-text-secondary">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Role</th>
                        <th className="px-4 py-2">Location</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantUsers.map((tenantUser) => (
                        <tr key={tenantUser.id} className="theme-surface border-t border-white/5">
                          <td className="px-4 py-2 theme-text-primary font-semibold">
                            {tenantUser.name}
                            {tenantUser.isPlatformAdmin && (
                              <span className="ml-2 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-100">
                                Platform
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 theme-text-secondary lowercase">{tenantUser.email ?? '—'}</td>
                          <td className="px-4 py-2 theme-text-secondary capitalize">
                            <select
                              value={tenantUser.role}
                              onChange={(e) => handleChangeUserRole(tenantUser, e.target.value)}
                              className="rounded-full border border-white/20 bg-transparent px-2 py-1 text-xs"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="cashier">Cashier</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 theme-text-secondary">
                            <select
                              value={tenantUser.locationId || ''}
                              onChange={(e) => {
                                const newLocationId = e.target.value || undefined;
                                handleChangeUserLocation(tenantUser, newLocationId);
                              }}
                              className="rounded-full border border-white/20 bg-transparent px-2 py-1 text-xs"
                            >
                              <option value="">-- No Location --</option>
                              {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                  {location.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleResetPin(tenantUser)}
                                className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-sky-400 hover:text-sky-200"
                              >
                                Reset PIN
                              </button>
                              {!tenantUser.isPlatformAdmin && (
                                <button
                                  onClick={() => handleDeleteUser(tenantUser)}
                                  className="theme-chip rounded-full border border-red-500/60 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tenantUsers.length === 0 && !usersLoading && (
                        <tr>
                          <td className="px-4 py-4 text-center theme-text-secondary" colSpan={5}>
                            No users yet. Add your first teammate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SectionContainer>
        )}

        {isTenantAdmin && (
          <SectionContainer
            title="Payment Gateway"
            description="Configure Monnify payment integration for your tenant. Payments will use these credentials when enabled."
          >
            {loadingPaymentSettings ? (
              <div className="py-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
                <p className="theme-text-secondary mt-2 text-sm">Loading payment settings...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <h3 className="theme-text-primary text-sm font-semibold">Enable Monnify Payments</h3>
                    <p className="theme-text-secondary text-xs">
                      When enabled, card and QR payments will be processed through Monnify
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={monnifyForm.enabled}
                      onChange={(e) => setMonnifyForm({ ...monnifyForm, enabled: e.target.checked })}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300" />
                  </label>
                </div>

                {monnifyForm.enabled && (
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <label className="theme-text-primary mb-2 block text-sm font-medium">
                        Monnify API Key
                      </label>
                      <input
                        type="text"
                        value={monnifyForm.apiKey}
                        onChange={(e) => setMonnifyForm({ ...monnifyForm, apiKey: e.target.value })}
                        placeholder={paymentSettings?.monnifyApiKey || 'Enter your Monnify API Key'}
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                      <p className="theme-text-secondary mt-1 text-xs">
                        Get this from your Monnify dashboard → Settings → API Keys
                      </p>
                    </div>

                    <div>
                      <label className="theme-text-primary mb-2 block text-sm font-medium">
                        Monnify Secret Key
                      </label>
                      <input
                        type="password"
                        value={monnifyForm.secretKey}
                        onChange={(e) => setMonnifyForm({ ...monnifyForm, secretKey: e.target.value })}
                        placeholder={paymentSettings?.monnifySecretKey || 'Enter your Monnify Secret Key'}
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                      <p className="theme-text-secondary mt-1 text-xs">
                        Keep this secure. It will be stored encrypted in your tenant settings.
                      </p>
                    </div>

                    <div>
                      <label className="theme-text-primary mb-2 block text-sm font-medium">
                        Monnify Contract Code
                      </label>
                      <input
                        type="text"
                        value={monnifyForm.contractCode}
                        onChange={(e) => setMonnifyForm({ ...monnifyForm, contractCode: e.target.value })}
                        placeholder={paymentSettings?.monnifyContractCode || 'Enter your Monnify Contract Code'}
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                      <p className="theme-text-secondary mt-1 text-xs">
                        Found in your Monnify merchant profile
                      </p>
                    </div>

                    <div>
                      <label className="theme-text-primary mb-2 block text-sm font-medium">
                        Monnify Webhook Secret (Optional)
                      </label>
                      <input
                        type="password"
                        value={monnifyForm.webhookSecret}
                        onChange={(e) => setMonnifyForm({ ...monnifyForm, webhookSecret: e.target.value })}
                        placeholder={paymentSettings?.monnifyWebhookSecret || 'Enter webhook secret for verification'}
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                      />
                      <p className="theme-text-secondary mt-1 text-xs">
                        Used to verify webhook signatures from Monnify
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={async () => {
                          if (!monnifyForm.apiKey || !monnifyForm.secretKey || !monnifyForm.contractCode) {
                            toast.error('Please fill in API Key, Secret Key, and Contract Code');
                            return;
                          }

                          setSavingPaymentSettings(true);
                          try {
                            const updateData: UpdatePaymentSettingsRequest = {
                              monnifyEnabled: monnifyForm.enabled,
                            };

                            // Only update fields that have been changed (not masked values)
                            if (monnifyForm.apiKey && !monnifyForm.apiKey.includes('...')) {
                              updateData.monnifyApiKey = monnifyForm.apiKey;
                            }
                            if (monnifyForm.secretKey && !monnifyForm.secretKey.includes('...')) {
                              updateData.monnifySecretKey = monnifyForm.secretKey;
                            }
                            if (monnifyForm.contractCode) {
                              updateData.monnifyContractCode = monnifyForm.contractCode;
                            }
                            if (monnifyForm.webhookSecret && !monnifyForm.webhookSecret.includes('...')) {
                              updateData.monnifyWebhookSecret = monnifyForm.webhookSecret;
                            }

                            const updated = await PaymentSettingsService.updatePaymentSettings(updateData);
                            setPaymentSettings(updated);
                            toast.success('Payment settings saved successfully');
                            
                            // Update form with masked values
                            setMonnifyForm({
                              apiKey: updated.monnifyApiKey || '',
                              secretKey: updated.monnifySecretKey || '',
                              contractCode: updated.monnifyContractCode || '',
                              webhookSecret: updated.monnifyWebhookSecret || '',
                              enabled: updated.monnifyEnabled,
                            });
                          } catch (error: any) {
                            toast.error(error?.response?.data?.message || 'Failed to save payment settings');
                          } finally {
                            setSavingPaymentSettings(false);
                          }
                        }}
                        disabled={savingPaymentSettings}
                        className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-6 py-2 font-semibold text-white shadow-lg transition hover:shadow-sky-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingPaymentSettings ? 'Saving...' : 'Save Settings'}
                      </button>
                      <a
                        href="https://developers.monnify.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="theme-chip rounded-full border px-6 py-2 font-semibold transition hover:border-sky-400 hover:text-sky-200"
                      >
                        View Monnify Docs
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionContainer>
        )}

        {isTenantAdmin && (
          <SectionContainer
            title="Barcode/QR Scanners"
            description="Configure and manage barcode and QR code scanners for checkout."
          >
            <div className="space-y-6">
            {/* Scanner Types Info */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                <div className="text-3xl mb-2">🔌</div>
                <h4 className="theme-text-primary mb-2 text-sm font-semibold text-sky-400">USB Scanners</h4>
                <p className="theme-text-secondary text-xs">
                  Most USB barcode scanners work automatically as keyboards. Just plug in and scan - no setup needed!
                </p>
                <div className="mt-3 pt-3 border-t border-sky-500/20">
                  <p className="theme-text-secondary text-xs">
                    <strong className="theme-text-primary">Works with:</strong> Any USB HID scanner
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Browser:</strong> All browsers
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="text-3xl mb-2">📡</div>
                <h4 className="theme-text-primary mb-2 text-sm font-semibold text-purple-400">Bluetooth Scanners</h4>
                <p className="theme-text-secondary text-xs">
                  Pair Bluetooth scanners via your system's Bluetooth settings first. After pairing, they'll work automatically.
                </p>
                <div className="mt-3 pt-3 border-t border-purple-500/20">
                  <p className="theme-text-secondary text-xs">
                    <strong className="theme-text-primary">Works with:</strong> Bluetooth HID scanners
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Pairing:</strong> System Bluetooth (not browser)
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Note:</strong> Pair in OS settings, then use in app
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="text-3xl mb-2">📷</div>
                <h4 className="theme-text-primary mb-2 text-sm font-semibold text-emerald-400">Camera Scanner</h4>
                <p className="theme-text-secondary text-xs">
                  Use your device's camera to scan QR codes and barcodes. Click the camera button in checkout.
                </p>
                <div className="mt-3 pt-3 border-t border-emerald-500/20">
                  <p className="theme-text-secondary text-xs">
                    <strong className="theme-text-primary">Works with:</strong> Any device with camera
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Browser:</strong> All modern browsers
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Requires:</strong> Camera permission
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Setup Guide */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h4 className="theme-text-primary mb-3 text-sm font-semibold text-amber-400">
                🚀 Quick Setup Guide
              </h4>
              <ol className="theme-text-secondary space-y-2 text-xs list-decimal list-inside">
                <li>
                  <strong className="theme-text-primary">USB Scanner:</strong> Simply plug in your USB scanner. 
                  It will work immediately - just scan barcodes and they'll appear in the checkout input field.
                </li>
                <li>
                  <strong className="theme-text-primary">Bluetooth Scanner:</strong> Pair via your system's Bluetooth settings first 
                  (Windows Settings, macOS System Preferences, or Linux Bluetooth manager). After pairing, the scanner will work automatically.
                </li>
                <li>
                  <strong className="theme-text-primary">Camera Scanner:</strong> Click the camera button in checkout 
                  and allow camera access when prompted. Point at QR codes or barcodes to scan.
                </li>
                <li>
                  <strong className="theme-text-primary">Registration:</strong> Scanners are automatically registered 
                  when first used. You can view registered scanners in the checkout page.
                </li>
              </ol>
            </div>

            {/* Troubleshooting */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h4 className="theme-text-primary mb-3 text-sm font-semibold">🔧 Troubleshooting</h4>
              <div className="space-y-3 text-xs theme-text-secondary">
                <div>
                  <strong className="theme-text-primary">USB scanner not working?</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>Make sure the scanner is in "HID Keyboard" mode (most default)</li>
                    <li>Try unplugging and reconnecting the scanner</li>
                    <li>Check that the checkout input field is focused</li>
                    <li>Some scanners need drivers - check manufacturer website</li>
                  </ul>
                </div>
                <div>
                  <strong className="theme-text-primary">Bluetooth scanner not working?</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>Pair the scanner via your system's Bluetooth settings first (not browser)</li>
                    <li>Make sure scanner is in pairing/discoverable mode</li>
                    <li>Check that Bluetooth is enabled on your computer</li>
                    <li>After system pairing, the scanner should appear in the Devices section</li>
                    <li>If using HID mode, scanner will type into input fields automatically</li>
                  </ul>
                </div>
                <div>
                  <strong className="theme-text-primary">Camera not working?</strong>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    <li>Allow camera access when prompted</li>
                    <li>Check browser settings if permission was denied</li>
                    <li>Ensure no other app is using the camera</li>
                    <li>Try refreshing the page and granting permission again</li>
                  </ul>
                </div>
              </div>
            </div>
            </div>
          </SectionContainer>
        )}

        {isTenantAdmin && (
          <SectionContainer
            title="Receipt Printer"
            description="Configure ESC/POS receipt printers for automatic printing. Requires print proxy server running locally."
          >
            <div className="space-y-6">
            {/* Print Proxy URL */}
            <div>
              <label className="theme-text-primary mb-2 block text-sm font-medium">
                Print Proxy WebSocket URL
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={printProxyUrl}
                  onChange={(e) => setPrintProxyUrl(e.target.value)}
                  placeholder="ws://localhost:8080"
                  className="theme-text-primary flex-1 rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                />
                <button
                  onClick={handleSavePrintProxyUrl}
                  className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg"
                >
                  Save & Connect
                </button>
              </div>
              <p className="theme-text-secondary mt-2 text-xs">
                Default: ws://localhost:8080. Start the print proxy server before connecting.
              </p>
            </div>

            {/* Printer Status */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="theme-text-primary text-sm font-semibold">Printer Status</h3>
                  <p className="theme-text-secondary text-xs mt-1">
                    {printerAvailable === null
                      ? 'Checking connection...'
                      : printerAvailable
                      ? '✓ Connected to print proxy'
                      : '✗ Not connected. Start print proxy server.'}
                  </p>
                </div>
                {printerAvailable && (
                  <button
                    onClick={loadPrinters}
                    disabled={loadingPrinters}
                    className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400"
                  >
                    {loadingPrinters ? 'Loading...' : '🔄 Refresh'}
                  </button>
                )}
              </div>
            </div>

            {/* Register Printer Form */}
            {printerAvailable && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="theme-text-primary mb-4 text-sm font-semibold">Register New Printer</h3>
                <form onSubmit={handleRegisterPrinter} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="theme-text-secondary mb-1 block text-xs font-medium">
                        Printer ID
                      </label>
                      <input
                        type="text"
                        value={printerForm.id}
                        onChange={(e) => setPrinterForm({ ...printerForm, id: e.target.value })}
                        placeholder="default-printer"
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="theme-text-secondary mb-1 block text-xs font-medium">
                        Printer Type
                      </label>
                      <select
                        value={printerForm.type}
                        onChange={(e) =>
                          setPrinterForm({ ...printerForm, type: e.target.value as 'serial' | 'network' })
                        }
                        className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                      >
                        <option value="serial">Serial/USB</option>
                        <option value="network">Network (TCP/IP)</option>
                      </select>
                    </div>
                  </div>

                  {printerForm.type === 'serial' ? (
                    <>
                      <div>
                        <label className="theme-text-secondary mb-1 block text-xs font-medium">
                          Port Path *
                        </label>
                        <input
                          type="text"
                          value={printerForm.path}
                          onChange={(e) => setPrinterForm({ ...printerForm, path: e.target.value })}
                          placeholder="COM3 (Windows) or /dev/ttyUSB0 (Linux/Mac)"
                          className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="theme-text-secondary mb-1 block text-xs font-medium">
                          Baud Rate
                        </label>
                        <input
                          type="number"
                          value={printerForm.baudRate}
                          onChange={(e) => setPrinterForm({ ...printerForm, baudRate: e.target.value })}
                          placeholder="9600"
                          className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="theme-text-secondary mb-1 block text-xs font-medium">
                            Host/IP Address *
                          </label>
                          <input
                            type="text"
                            value={printerForm.host}
                            onChange={(e) => setPrinterForm({ ...printerForm, host: e.target.value })}
                            placeholder="192.168.1.100"
                            className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="theme-text-secondary mb-1 block text-xs font-medium">
                            Port
                          </label>
                          <input
                            type="number"
                            value={printerForm.port}
                            onChange={(e) => setPrinterForm({ ...printerForm, port: e.target.value })}
                            placeholder="9100"
                            className="theme-text-primary w-full rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={registeringPrinter}
                    className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {registeringPrinter ? 'Registering...' : 'Register Printer'}
                  </button>
                </form>
              </div>
            )}

            {/* Registered Printers List */}
            {printerAvailable && printers.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h3 className="theme-text-primary mb-3 text-sm font-semibold">Registered Printers</h3>
                <div className="space-y-2">
                  {printers.map((printer) => (
                    <div
                      key={printer.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div>
                        <p className="theme-text-primary text-sm font-semibold">{printer.id}</p>
                        <p className="theme-text-secondary text-xs">
                          {printer.type === 'serial'
                            ? `Serial: ${printer.config.path} @ ${printer.config.baudRate} baud`
                            : `Network: ${printer.config.host}:${printer.config.port}`}
                        </p>
                      </div>
                      <span className="theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h3 className="theme-text-primary mb-2 text-sm font-semibold text-amber-400">
                📋 Setup Instructions
              </h3>
              <ol className="theme-text-secondary space-y-1 text-xs list-decimal list-inside">
                <li>Install Node.js on the computer connected to the printer</li>
                <li>Navigate to <code className="px-1 py-0.5 rounded bg-black/20">apps/print-proxy</code> directory</li>
                <li>Run <code className="px-1 py-0.5 rounded bg-black/20">npm install</code> to install dependencies</li>
                <li>Start the server: <code className="px-1 py-0.5 rounded bg-black/20">node server.js</code></li>
                <li>Configure the printer above using the printer's port or network address</li>
              </ol>
            </div>
            </div>
          </SectionContainer>
        )}

        {isTenantAdmin && (
          <SectionContainer
            title="Devices"
            description="View and manage connected devices including scanners, printers, and cash registers."
          >
            <div className="space-y-6">
            {/* Device Types Info */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="text-3xl mb-2">🔌</div>
                <h4 className="theme-text-primary mb-2 text-sm font-semibold text-emerald-400">USB Devices</h4>
                <p className="theme-text-secondary text-xs">
                  USB scanners, printers, and cash registers connect automatically when plugged in. No pairing needed!
                </p>
                <div className="mt-3 pt-3 border-t border-emerald-500/20">
                  <p className="theme-text-secondary text-xs">
                    <strong className="theme-text-primary">Auto-connect:</strong> Yes
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Setup:</strong> Plug and play
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                <div className="text-3xl mb-2">📡</div>
                <h4 className="theme-text-primary mb-2 text-sm font-semibold text-purple-400">Bluetooth Devices</h4>
                <p className="theme-text-secondary text-xs">
                  Bluetooth scanners and printers must be paired via your system's Bluetooth settings first, then they'll appear here.
                </p>
                <div className="mt-3 pt-3 border-t border-purple-500/20">
                  <p className="theme-text-secondary text-xs">
                    <strong className="theme-text-primary">Pairing:</strong> System Bluetooth
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Note:</strong> Pair in OS settings, not browser
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                <div className="text-3xl mb-2">🖨️</div>
                <h4 className="theme-text-primary mb-2 text-sm font-semibold text-sky-400">Printers & Cash Registers</h4>
                <p className="theme-text-secondary text-xs">
                  Receipt printers and cash registers are managed via the print proxy. See Receipt Printer section below.
                </p>
                <div className="mt-3 pt-3 border-t border-sky-500/20">
                  <p className="theme-text-secondary text-xs">
                    <strong className="theme-text-primary">Connection:</strong> Print Proxy
                  </p>
                  <p className="theme-text-secondary text-xs mt-1">
                    <strong className="theme-text-primary">Types:</strong> Serial/USB, Network
                  </p>
                </div>
              </div>
            </div>

            {/* Bluetooth Pairing Instructions */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
              <h4 className="theme-text-primary mb-3 text-sm font-semibold text-purple-400">
                📡 How to Pair Bluetooth Devices
              </h4>
              <div className="space-y-3 text-xs theme-text-secondary">
                <div>
                  <strong className="theme-text-primary">Important:</strong> Bluetooth devices must be paired via your operating system's Bluetooth settings, NOT through the browser.
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <strong className="theme-text-primary">Windows:</strong>
                    <ol className="mt-1 ml-4 list-decimal space-y-1">
                      <li>Open Settings → Devices → Bluetooth</li>
                      <li>Put device in pairing mode</li>
                      <li>Click "Add Bluetooth or other device"</li>
                      <li>Select your scanner/printer</li>
                      <li>Device will appear here after pairing</li>
                    </ol>
                  </div>
                  <div>
                    <strong className="theme-text-primary">macOS:</strong>
                    <ol className="mt-1 ml-4 list-decimal space-y-1">
                      <li>Open System Preferences → Bluetooth</li>
                      <li>Put device in pairing mode</li>
                      <li>Click device name when it appears</li>
                      <li>Click "Pair"</li>
                      <li>Device will appear here after pairing</li>
                    </ol>
                  </div>
                  <div>
                    <strong className="theme-text-primary">Linux:</strong>
                    <ol className="mt-1 ml-4 list-decimal space-y-1">
                      <li>Open Bluetooth settings</li>
                      <li>Put device in pairing mode</li>
                      <li>Scan for devices</li>
                      <li>Select and pair your device</li>
                      <li>Device will appear here after pairing</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Devices List */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="theme-text-primary text-sm font-semibold">Connected Devices</h3>
                <button
                  onClick={async () => {
                    setLoadingDevices(true);
                    try {
                      const devices = await fetchRegisteredDevices(user?.locationId);
                      setRegisteredDevices(devices);
                      toast.success('Devices refreshed');
                    } catch (error) {
                      toast.error('Failed to refresh devices');
                    } finally {
                      setLoadingDevices(false);
                    }
                  }}
                  disabled={loadingDevices}
                  className="theme-chip rounded-full border px-4 py-2 text-xs font-semibold transition hover:border-sky-400 disabled:opacity-50"
                >
                  {loadingDevices ? 'Loading...' : '🔄 Refresh'}
                </button>
              </div>

              {loadingDevices ? (
                <div className="text-center py-8">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                  <p className="theme-text-secondary mt-2 text-sm">Loading devices...</p>
                </div>
              ) : registeredDevices.length === 0 && scannerDevices.length === 0 && printers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📱</div>
                  <p className="theme-text-primary text-sm font-semibold mb-1">No devices connected</p>
                  <p className="theme-text-secondary text-xs">
                    Connect USB devices or pair Bluetooth devices via system settings to see them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Registered Scanner Devices */}
                  {registeredDevices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {device.type === 'usb' && '🔌'}
                          {device.type === 'bluetooth' && '📡'}
                          {device.type === 'camera' && '📷'}
                        </div>
                        <div>
                          <p className="theme-text-primary text-sm font-semibold">{device.name}</p>
                          <p className="theme-text-secondary text-xs">
                            {device.type === 'usb' && 'USB Scanner'}
                            {device.type === 'bluetooth' && 'Bluetooth Scanner'}
                            {device.type === 'camera' && 'Camera Scanner'}
                            {' • '}
                            Connected {format(new Date(device.connectedAt), 'MMM dd, yyyy')}
                            {device.lastUsedAt && ` • Last used ${format(new Date(device.lastUsedAt), 'MMM dd, HH:mm')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.isActive && (
                          <span className="theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                            Active
                          </span>
                        )}
                        {device.type === 'bluetooth' && (
                          <span className="theme-chip rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                            System Paired
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Local Scanner Devices (from store) */}
                  {scannerDevices
                    .filter((d) => !registeredDevices.find((rd) => rd.id === d.id))
                    .map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {device.type === 'usb' && '🔌'}
                            {device.type === 'bluetooth' && '📡'}
                            {device.type === 'camera' && '📷'}
                          </div>
                          <div>
                            <p className="theme-text-primary text-sm font-semibold">{device.name}</p>
                            <p className="theme-text-secondary text-xs">
                              {device.type === 'usb' && 'USB Scanner'}
                              {device.type === 'bluetooth' && 'Bluetooth Scanner'}
                              {device.type === 'camera' && 'Camera Scanner'}
                              {' • '}
                              Connected {format(new Date(device.connectedAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {device.isActive && (
                            <span className="theme-chip rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                              Active
                            </span>
                          )}
                          {device.type === 'bluetooth' && (
                            <span className="theme-chip rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                              System Paired
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                  {/* Printers */}
                  {printers.map((printer) => (
                    <div
                      key={printer.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">🖨️</div>
                        <div>
                          <p className="theme-text-primary text-sm font-semibold">{printer.id}</p>
                          <p className="theme-text-secondary text-xs">
                            {printer.type === 'serial'
                              ? `Serial/USB: ${printer.config.path} @ ${printer.config.baudRate} baud`
                              : `Network: ${printer.config.host}:${printer.config.port}`}
                            {' • '}
                            Receipt Printer
                          </p>
                        </div>
                      </div>
                      <span className="theme-chip rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                        {printer.type === 'serial' ? 'USB' : 'Network'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

              {/* Device Management Info */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h4 className="theme-text-primary mb-2 text-sm font-semibold text-amber-400">
                ℹ️ Device Management Notes
              </h4>
              <ul className="theme-text-secondary space-y-1 text-xs list-disc list-inside">
                <li>
                  <strong className="theme-text-primary">USB Devices:</strong> Automatically detected when plugged in. No configuration needed.
                </li>
                <li>
                  <strong className="theme-text-primary">Bluetooth Devices:</strong> Must be paired via system Bluetooth settings first. After pairing, they'll appear here automatically.
                </li>
                <li>
                  <strong className="theme-text-primary">Printers:</strong> Configure in the Receipt Printer section below. Requires print proxy server.
                </li>
                <li>
                  <strong className="theme-text-primary">Cash Registers:</strong> Configure as network printers in the Receipt Printer section.
                </li>
              </ul>
            </div>
            </div>
          </SectionContainer>
        )}

        <SectionContainer
          title="Workspace"
          description="Control interface preferences for all team members."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3">
              <div>
                <h3 className="theme-text-primary text-sm font-semibold">Theme</h3>
                <p className="theme-text-secondary text-xs">
                  Toggle between light and dark modes. Preference is stored per device.
                </p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5/0 px-4 py-3">
              <div>
                <h3 className="theme-text-primary text-sm font-semibold">Sound effects</h3>
                <p className="theme-text-secondary text-xs">
                  Audio cues will be available in a future release.
                </p>
              </div>
              <span className="theme-chip rounded-full border px-3 py-1 text-xs font-semibold">Coming soon</span>
            </div>
          </div>
        </SectionContainer>

        <div className="theme-text-secondary text-xs">
          Logged in as <span className="theme-text-primary font-medium">{user?.name}</span> on tenant{' '}
          <span className="theme-text-primary font-medium lowercase">{tenant?.slug ?? 'unknown'}</span>. Role:{' '}
          <span className="theme-text-primary font-medium capitalize">{user?.role ?? 'unknown'}</span>
        </div>
      </div>
    </div>
  );
}

