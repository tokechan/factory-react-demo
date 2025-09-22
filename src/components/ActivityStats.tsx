import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Card from './Card';
import StatCard from './StatCard';

interface DailyActivity {
  date: string;
  uploads: number;
  views: number;
  downloads: number;
  original_accesses: number;
}

interface FileTypeStats {
  type: string;
  count: number;
  total_size_gb: number;
  color: string;
}

interface ActivityStatsProps {
  dailyActivity: DailyActivity[];
  fileTypeStats: FileTypeStats[];
  totalPhotos: number;
  totalViews: number;
  avgPhotosPerDay: number;
  mostActiveDay: string;
  className?: string;
}

const ActivityStats: React.FC<ActivityStatsProps> = ({
  dailyActivity,
  fileTypeStats,
  totalPhotos,
  totalViews,
  avgPhotosPerDay,
  mostActiveDay,
  className,
}) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'M/d', { locale: ja });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}回
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getTrendFromDaily = (data: DailyActivity[], key: keyof DailyActivity) => {
    if (data.length < 2) return { value: 0, isPositive: true };
    
    const recent = data.slice(-7); // Last 7 days
    const previous = data.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recent.reduce((sum, item) => sum + (item[key] as number), 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + (item[key] as number), 0) / previous.length || 1;
    
    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    return {
      value: Math.abs(changePercent),
      isPositive: changePercent >= 0,
    };
  };

  const uploadTrend = getTrendFromDaily(dailyActivity, 'uploads');
  const viewTrend = getTrendFromDaily(dailyActivity, 'views');

  return (
    <div className={className}>
      {/* Activity Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="総写真数"
          value={totalPhotos}
          subtitle="枚の写真を管理"
          icon="📸"
          color="blue"
        />
        
        <StatCard
          title="総閲覧数"
          value={totalViews}
          subtitle="回の閲覧"
          icon="👁️"
          color="green"
          trend={{
            value: viewTrend.value,
            label: "過去7日平均",
            isPositive: viewTrend.isPositive,
          }}
        />
        
        <StatCard
          title="1日平均アップロード"
          value={avgPhotosPerDay.toFixed(1)}
          subtitle="枚/日"
          icon="📤"
          color="purple"
          trend={{
            value: uploadTrend.value,
            label: "過去7日平均",
            isPositive: uploadTrend.isPositive,
          }}
        />
        
        <StatCard
          title="最もアクティブな日"
          value={format(new Date(mostActiveDay), 'M/d', { locale: ja })}
          subtitle="最大アップロード日"
          icon="🔥"
          color="yellow"
        />
      </div>

      {/* Daily Activity Chart */}
      <Card title="📊 日次アクティビティ" className="mb-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="views"
                stackId="1"
                stroke="#10b981"
                fill="#34d399"
                name="閲覧"
              />
              <Area
                type="monotone"
                dataKey="uploads"
                stackId="2"
                stroke="#3b82f6"
                fill="#60a5fa"
                name="アップロード"
              />
              <Area
                type="monotone"
                dataKey="downloads"
                stackId="3"
                stroke="#8b5cf6"
                fill="#a78bfa"
                name="ダウンロード"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload vs View Trend */}
        <Card title="📈 アップロード・閲覧トレンド">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="uploads"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  name="アップロード"
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  name="閲覧"
                />
                <Line
                  type="monotone"
                  dataKey="original_accesses"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                  name="原本アクセス"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* File Type Distribution */}
        <Card title="📁 ファイル形式別統計">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fileTypeStats} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="type" fontSize={12} />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    name === 'count' ? `${value}枚` : `${value.toFixed(2)}GB`,
                    name === 'count' ? 'ファイル数' : 'サイズ'
                  ]}
                />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="ファイル数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2">
            {fileTypeStats.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700">{item.type}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{item.count}枚</span>
                  <span className="text-gray-500 ml-2">
                    ({item.total_size_gb.toFixed(2)}GB)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity Insights */}
      <Card title="📊 アクティビティ分析" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-xl">📸</span>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  アップロード傾向
                </h4>
                <p className="text-sm text-blue-800">
                  過去7日間で平均 {avgPhotosPerDay.toFixed(1)}枚/日のアップロード
                  {uploadTrend.isPositive ? (
                    <span className="text-green-600 ml-1">📈 増加傾向</span>
                  ) : (
                    <span className="text-red-600 ml-1">📉 減少傾向</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">👁️</span>
              <div>
                <h4 className="text-sm font-semibold text-green-900 mb-1">
                  閲覧パターン
                </h4>
                <p className="text-sm text-green-800">
                  写真1枚あたり平均 {(totalViews / totalPhotos).toFixed(1)}回の閲覧
                  {viewTrend.isPositive ? (
                    <span className="text-green-600 ml-1">📈 活発</span>
                  ) : (
                    <span className="text-gray-600 ml-1">📊 安定</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-purple-500 text-xl">🎯</span>
              <div>
                <h4 className="text-sm font-semibold text-purple-900 mb-1">
                  最適化効果
                </h4>
                <p className="text-sm text-purple-800">
                  サムネイル表示により原本アクセスを
                  {((1 - (dailyActivity.reduce((sum, day) => sum + day.original_accesses, 0) / totalViews)) * 100).toFixed(0)}%削減
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ActivityStats;
