import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Card from './Card';

interface StorageBreakdown {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: string | number; // Add index signature for Recharts compatibility
}

interface StorageUsageData {
  date: string;
  standard_gb: number;
  ia_gb: number;
  total_gb: number;
}

interface StorageChartProps {
  breakdown: StorageBreakdown[];
  usageHistory: StorageUsageData[];
  totalUsage: number;
  totalQuota: number;
  className?: string;
}

const StorageChart: React.FC<StorageChartProps> = ({
  breakdown,
  usageHistory,
  totalUsage,
  totalQuota,
  className,
}) => {
  const formatBytes = (gb: number): string => {
    if (gb >= 1) {
      return `${gb.toFixed(2)}GB`;
    } else {
      return `${(gb * 1024).toFixed(0)}MB`;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatBytes(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatDateForChart = (dateString: string) => {
    return format(new Date(dateString), 'M/d', { locale: ja });
  };

  const quotaPercentage = (totalUsage / totalQuota) * 100;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Breakdown Pie Chart */}
        <Card title="📊 ストレージ内訳">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatBytes(value), 'サイズ']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2">
            {breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{formatBytes(item.value)}</span>
                  <span className="text-gray-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
            
            {/* Quota Bar */}
            <div className="pt-3 border-t">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>使用量</span>
                <span>{formatBytes(totalUsage)} / {formatBytes(totalQuota)}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    quotaPercentage > 90 ? 'bg-red-500' : 
                    quotaPercentage > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {quotaPercentage.toFixed(1)}% 使用中
                {quotaPercentage > 80 && (
                  <span className="text-yellow-600 ml-2">⚠️ 容量注意</span>
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Storage Usage History */}
        <Card title="📈 ストレージ使用量推移">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDateForChart}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => formatBytes(value)}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ia_gb"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#fbbf24"
                  name="Archive"
                />
                <Area
                  type="monotone"
                  dataKey="standard_gb"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#60a5fa"
                  name="Standard"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
              <span>Archive</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Storage Usage Trend */}
      <Card title="📊 月間ストレージ推移" className="mt-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usageHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDateForChart}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => formatBytes(value)}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_gb"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                name="総使用量"
              />
              <Line
                type="monotone"
                dataKey="standard_gb"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                name="Standard"
              />
              <Line
                type="monotone"
                dataKey="ia_gb"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                name="Archive"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default StorageChart;
