import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { 
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';

interface ConfigItem {
  id: string;
  category: string;
  key: string;
  value: string | null;
  encryptedValue: string | null;
  description: string | null;
  isSecret: boolean;
  updatedAt: string;
}

// Predefined categories with common settings
const CATEGORY_DEFINITIONS: Record<string, { name: string; description: string; fields: { key: string; label: string; isSecret: boolean; description: string }[] }> = {
  smtp: {
    name: 'SMTP / Email',
    description: 'Email server configuration for sending transactional emails',
    fields: [
      { key: 'host', label: 'SMTP Host', isSecret: false, description: 'e.g., smtp.gmail.com' },
      { key: 'port', label: 'SMTP Port', isSecret: false, description: 'e.g., 587 for TLS' },
      { key: 'username', label: 'SMTP Username', isSecret: false, description: 'Email address or username' },
      { key: 'password', label: 'SMTP Password', isSecret: true, description: 'App password or SMTP password' },
      { key: 'from_email', label: 'From Email', isSecret: false, description: 'Default sender email address' },
      { key: 'from_name', label: 'From Name', isSecret: false, description: 'Default sender name' },
    ],
  },
  payfast: {
    name: 'PayFast',
    description: 'PayFast payment gateway credentials',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', isSecret: false, description: 'PayFast Merchant ID' },
      { key: 'merchant_key', label: 'Merchant Key', isSecret: true, description: 'PayFast Merchant Key' },
      { key: 'passphrase', label: 'Passphrase', isSecret: true, description: 'ITN Passphrase for signature validation' },
      { key: 'sandbox', label: 'Sandbox Mode', isSecret: false, description: 'true for testing, false for production' },
    ],
  },
  ozow: {
    name: 'Ozow',
    description: 'Ozow instant EFT payment gateway credentials',
    fields: [
      { key: 'site_code', label: 'Site Code', isSecret: false, description: 'Ozow Site Code' },
      { key: 'private_key', label: 'Private Key', isSecret: true, description: 'Ozow Private Key for API calls' },
      { key: 'api_key', label: 'API Key', isSecret: true, description: 'Ozow API Key' },
      { key: 'test_mode', label: 'Test Mode', isSecret: false, description: 'true for testing, false for production' },
    ],
  },
  cloudflare: {
    name: 'Cloudflare',
    description: 'Cloudflare API credentials for CDN, R2 storage, and email routing',
    fields: [
      { key: 'account_id', label: 'Account ID', isSecret: false, description: 'Cloudflare Account ID' },
      { key: 'api_token', label: 'API Token', isSecret: true, description: 'Cloudflare API Token' },
      { key: 'r2_access_key', label: 'R2 Access Key', isSecret: false, description: 'R2 Access Key ID' },
      { key: 'r2_secret_key', label: 'R2 Secret Key', isSecret: true, description: 'R2 Secret Access Key' },
      { key: 'r2_bucket', label: 'R2 Bucket Name', isSecret: false, description: 'R2 storage bucket name' },
      { key: 'r2_public_url', label: 'R2 Public URL', isSecret: false, description: 'Public URL for R2 bucket' },
      { key: 'zone_id', label: 'Zone ID', isSecret: false, description: 'Cloudflare Zone ID for your domain' },
      { key: 'email_routing_enabled', label: 'Email Routing', isSecret: false, description: 'true to enable Cloudflare email routing' },
      { key: 'email_routing_domain', label: 'Email Domain', isSecret: false, description: 'Domain for email routing (e.g., zomieks.co.za)' },
      { key: 'email_catch_all', label: 'Catch-All Address', isSecret: false, description: 'Catch-all email forwarding address' },
    ],
  },
  sms: {
    name: 'SMS Gateway',
    description: 'SMS gateway for OTP and notifications',
    fields: [
      { key: 'provider', label: 'Provider', isSecret: false, description: 'SMS provider name (e.g., clickatell, bulksms)' },
      { key: 'api_key', label: 'API Key', isSecret: true, description: 'SMS Gateway API Key' },
      { key: 'api_secret', label: 'API Secret', isSecret: true, description: 'SMS Gateway API Secret' },
      { key: 'sender_id', label: 'Sender ID', isSecret: false, description: 'SMS sender name or number' },
    ],
  },
  platform: {
    name: 'Platform Settings',
    description: 'General platform configuration',
    fields: [
      { key: 'site_name', label: 'Site Name', isSecret: false, description: 'Platform display name' },
      { key: 'site_url', label: 'Site URL', isSecret: false, description: 'Primary website URL' },
      { key: 'support_email', label: 'Support Email', isSecret: false, description: 'Support contact email' },
      { key: 'support_phone', label: 'Support Phone', isSecret: false, description: 'Support contact phone' },
      { key: 'maintenance_mode', label: 'Maintenance Mode', isSecret: false, description: 'true to enable maintenance' },
    ],
  },
  banking: {
    name: 'Banking / Payouts',
    description: 'Bank account details for payout operations',
    fields: [
      { key: 'bank_name', label: 'Bank Name', isSecret: false, description: 'Platform bank name' },
      { key: 'account_holder', label: 'Account Holder', isSecret: false, description: 'Account holder name' },
      { key: 'account_number', label: 'Account Number', isSecret: true, description: 'Bank account number' },
      { key: 'branch_code', label: 'Branch Code', isSecret: false, description: 'Bank branch code' },
      { key: 'swift_code', label: 'SWIFT Code', isSecret: false, description: 'SWIFT/BIC code for international' },
    ],
  },
};

export default function ConfigurationPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['platform', 'smtp']));
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  
  // Custom config
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customConfig, setCustomConfig] = useState({ category: '', key: '', value: '', isSecret: false, description: '' });

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: ConfigItem[] }>('/admin/settings/config');
      setConfigs(res.data || []);
      
      // Pre-populate edit values
      const values: Record<string, string> = {};
      res.data?.forEach((item: ConfigItem) => {
        const fieldKey = `${item.category}.${item.key}`;
        values[fieldKey] = item.value || '';
      });
      setEditValues(values);
    } catch (error) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }

  function getFieldKey(category: string, key: string) {
    return `${category}.${key}`;
  }

  function getConfigValue(category: string, key: string): string {
    const fieldKey = getFieldKey(category, key);
    if (fieldKey in editValues) {
      return editValues[fieldKey];
    }
    const config = configs.find(c => c.category === category && c.key === key);
    return config?.value || '';
  }

  function handleFieldChange(category: string, key: string, value: string) {
    const fieldKey = getFieldKey(category, key);
    setEditValues(prev => ({ ...prev, [fieldKey]: value }));
    setModifiedFields(prev => new Set(prev).add(fieldKey));
  }

  async function saveField(category: string, key: string, isSecret: boolean) {
    const fieldKey = getFieldKey(category, key);
    const value = editValues[fieldKey] || '';
    
    try {
      setSaving(fieldKey);
      
      const existingConfig = configs.find(c => c.category === category && c.key === key);
      
      if (existingConfig) {
        await api.patch(`/admin/settings/config/${category}/${key}`, { value, isSecret });
      } else {
        await api.post('/admin/settings/config', { category, key, value, isSecret });
      }
      
      toast.success(`Saved ${key}`);
      setModifiedFields(prev => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
      loadConfigs();
    } catch (error) {
      toast.error(`Failed to save ${key}`);
    } finally {
      setSaving(null);
    }
  }

  async function saveCategory(categoryKey: string) {
    const definition = CATEGORY_DEFINITIONS[categoryKey];
    if (!definition) return;
    
    const updates = definition.fields.map(field => ({
      category: categoryKey,
      key: field.key,
      value: editValues[getFieldKey(categoryKey, field.key)] || '',
      isSecret: field.isSecret,
    }));
    
    try {
      setSaving(categoryKey);
      await api.post('/admin/settings/config/bulk', { configs: updates });
      toast.success(`Saved ${definition.name} settings`);
      
      // Clear modified flags for this category
      setModifiedFields(prev => {
        const next = new Set(prev);
        definition.fields.forEach(f => next.delete(getFieldKey(categoryKey, f.key)));
        return next;
      });
      loadConfigs();
    } catch (error) {
      toast.error(`Failed to save ${definition.name}`);
    } finally {
      setSaving(null);
    }
  }

  async function deleteConfig(category: string, key: string) {
    if (!confirm(`Delete configuration "${category}.${key}"?`)) return;
    
    try {
      await api.delete(`/admin/settings/config/${category}/${key}`);
      toast.success('Configuration deleted');
      loadConfigs();
    } catch (error) {
      toast.error('Failed to delete configuration');
    }
  }

  async function saveCustomConfig() {
    if (!customConfig.category || !customConfig.key) {
      toast.error('Category and key are required');
      return;
    }
    
    try {
      setSaving('custom');
      await api.post('/admin/settings/config', {
        category: customConfig.category.toLowerCase().replace(/\s+/g, '_'),
        key: customConfig.key.toLowerCase().replace(/\s+/g, '_'),
        value: customConfig.value,
        isSecret: customConfig.isSecret,
        description: customConfig.description,
      });
      toast.success('Custom configuration added');
      setShowCustomForm(false);
      setCustomConfig({ category: '', key: '', value: '', isSecret: false, description: '' });
      loadConfigs();
    } catch (error) {
      toast.error('Failed to add configuration');
    } finally {
      setSaving(null);
    }
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function toggleSecret(fieldKey: string) {
    setShowSecrets(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  }

  function hasUnsavedChanges(categoryKey: string): boolean {
    const definition = CATEGORY_DEFINITIONS[categoryKey];
    if (!definition) return false;
    return definition.fields.some(f => modifiedFields.has(getFieldKey(categoryKey, f.key)));
  }

  // Get custom configs (not in predefined categories)
  const predefinedKeys = new Set(
    Object.entries(CATEGORY_DEFINITIONS).flatMap(([cat, def]) => 
      def.fields.map(f => `${cat}.${f.key}`)
    )
  );
  const customConfigs = configs.filter(c => !predefinedKeys.has(`${c.category}.${c.key}`));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuration</h1>
          <p className="text-muted-foreground">Manage platform settings, API keys, and integrations</p>
        </div>
        <button
          onClick={() => setShowCustomForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          <PlusIcon className="h-5 w-5" />
          Add Custom
        </button>
      </div>

      {/* Predefined Categories */}
      <div className="space-y-4">
        {Object.entries(CATEGORY_DEFINITIONS).map(([categoryKey, definition]) => {
          const isExpanded = expandedCategories.has(categoryKey);
          const hasChanges = hasUnsavedChanges(categoryKey);
          
          return (
            <div key={categoryKey} className="bg-background border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(categoryKey)}
                className={cn(
                  "w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors",
                  isExpanded && "border-b"
                )}
              >
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {definition.name}
                    {hasChanges && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Unsaved</span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">{definition.description}</p>
                </div>
                <svg
                  className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {definition.fields.map(field => {
                    const fieldKey = getFieldKey(categoryKey, field.key);
                    const value = getConfigValue(categoryKey, field.key);
                    const isModified = modifiedFields.has(fieldKey);
                    const showSecret = showSecrets.has(fieldKey);
                    
                    return (
                      <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                        <div>
                          <label className="block text-sm font-medium">{field.label}</label>
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type={field.isSecret && !showSecret ? 'password' : 'text'}
                              value={value}
                              onChange={(e) => handleFieldChange(categoryKey, field.key, e.target.value)}
                              className={cn(
                                "w-full px-3 py-2 border rounded-lg pr-10",
                                isModified && "border-yellow-500"
                              )}
                              placeholder={field.isSecret ? '••••••••' : ''}
                            />
                            {field.isSecret && (
                              <button
                                type="button"
                                onClick={() => toggleSecret(fieldKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showSecret ? (
                                  <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                  <EyeIcon className="h-5 w-5" />
                                )}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => saveField(categoryKey, field.key, field.isSecret)}
                            disabled={saving === fieldKey || !isModified}
                            className={cn(
                              "px-3 py-2 rounded-lg transition-colors",
                              isModified
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {saving === fieldKey ? (
                              <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : (
                              <CheckIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {hasChanges && (
                    <div className="pt-4 border-t flex justify-end">
                      <button
                        onClick={() => saveCategory(categoryKey)}
                        disabled={saving === categoryKey}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                      >
                        {saving === categoryKey ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckIcon className="h-4 w-4" />
                        )}
                        Save All {definition.name}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Configurations */}
      {customConfigs.length > 0 && (
        <div className="bg-background border rounded-lg p-6">
          <h2 className="font-semibold mb-4">Custom Configurations</h2>
          <div className="space-y-2">
            {customConfigs.map(config => (
              <div key={config.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded mr-2">{config.category}</span>
                  <span className="font-medium">{config.key}</span>
                  {config.description && (
                    <span className="text-sm text-muted-foreground ml-2">- {config.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {config.isSecret ? '••••••••' : config.value}
                  </span>
                  <button
                    onClick={() => deleteConfig(config.category, config.key)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Modal */}
      {showCustomForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Add Custom Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input
                  type="text"
                  value={customConfig.category}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., analytics, notifications"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Key</label>
                <input
                  type="text"
                  value={customConfig.key}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., tracking_id, webhook_url"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <input
                  type={customConfig.isSecret ? 'password' : 'text'}
                  value={customConfig.value}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, value: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={customConfig.description}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Brief description of this setting"
                />
              </div>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customConfig.isSecret}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, isSecret: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">This is a secret value</span>
              </label>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowCustomForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomConfig}
                disabled={saving === 'custom'}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving === 'custom' ? 'Saving...' : 'Add Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
