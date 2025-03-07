// src/components/settings/TableSettingsSection.tsx
import { UserSettings } from '@/utils/settingsUtils';

interface TableSettingsSectionProps {
  settings: UserSettings;
  updateUserSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

export default function TableSettingsSection({ settings, updateUserSetting }: TableSettingsSectionProps) {
  return (
    <div>
      <h2 className="text-lg font-medium border-b border-gray-200 dark:border-gray-700 pb-2 pt-4">Table Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Compact Mode */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Compact Table Mode
          </label>
          <button
            type="button"
            onClick={() => updateUserSetting('tableCompactMode', !settings.tableCompactMode)}
            className={`${settings.tableCompactMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
          >
            <span
              aria-hidden="true"
              className={`${settings.tableCompactMode ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
          </button>
        </div>

        {/* Default Page Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Default Page Size
          </label>
          <select
            value={settings.defaultPageSize}
            onChange={(e) => updateUserSetting('defaultPageSize', parseInt(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={250}>250 rows</option>
          </select>
        </div>

        {/* Default Sort Column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Default Sort Column
          </label>
          <select
            value={settings.defaultSortColumn}
            onChange={(e) => updateUserSetting('defaultSortColumn', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="verkoop_order">Order #</option>
            <option value="project">Project</option>
            <option value="debiteur_klant">Customer</option>
            <option value="aanmaak_datum">Creation Date</option>
            <option value="lever_datum">Delivery Date</option>
            <option value="updatedAt">Last Updated</option>
          </select>
        </div>

        {/* Default Sort Direction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Default Sort Direction
          </label>
          <select
            value={settings.defaultSortDirection}
            onChange={(e) => updateUserSetting('defaultSortDirection', e.target.value as 'asc' | 'desc')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
    </div>
  );
}