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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import Card from './Card';
import StatCard from './StatCard';

interface CostBreakdown {
  category: string;
  cost_usd: number;
  color: string;
  description: string;
}

interface MonthlyCostData {
  month: string;
  storage_cost: number;
  operation_cost: number;
  retrieval_cost: number;
  total_cost: number;
}

interface CostAnalysisProps {
  currentMonthCost: number;
  projectedMonthEndCost: number;
  costBreakdown: CostBreakdown[];
  monthlyHistory: MonthlyCostData[];
  savingsFromIA: number;
  className?: string;
}

const CostAnalysis: React.FC<CostAnalysisProps> = ({
  currentMonthCost,
  projectedMonthEndCost,
  costBreakdown,
  monthlyHistory,
  savingsFromIA,
  className,
}) => {
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(3)}`;
  };

  const formatYen = (usd: number): string => {
    const yen = usd * 150; // Approximate exchange rate
    return `¥${yen.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalCurrentCost = costBreakdown.reduce((sum, item) => sum + item.cost_usd, 0);
  const costTrend = monthlyHistory.length > 1 ? 
    ((monthlyHistory[monthlyHistory.length - 1].total_cost - monthlyHistory[monthlyHistory.length - 2].total_cost) / 
     monthlyHistory[monthlyHistory.length - 2].total_cost) * 100 : 0;

  return (
    <div className={className}>
      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="今月のコスト"
          value={formatCurrency(currentMonthCost)}
          subtitle={formatYen(currentMonthCost)}
          icon="💰"
          color="blue"
          trend={{
            value: Math.abs(costTrend),
            label: "前月比",
            isPositive: costTrend < 0, // Lower cost is positive
          }}
        />
        
        <StatCard
          title="月末予測コスト"
          value={formatCurrency(projectedMonthEndCost)}
          subtitle={formatYen(projectedMonthEndCost)}
          icon="📊"
          color="purple"
        />
        
        <StatCard
          title="Archive節約額"
          value={formatCurrency(savingsFromIA)}
          subtitle={`${formatYen(savingsFromIA)} / 月`}
          icon="💚"
          color="green"
        />
        
        <StatCard
          title="年間予測コスト"
          value={formatCurrency(currentMonthCost * 12)}
          subtitle={formatYen(currentMonthCost * 12)}
          icon="📅"
          color="gray"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <Card title="💰 コスト内訳 (今月)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={80}
                  paddingAngle={1}
                  dataKey="cost_usd"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), 'コスト']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-3">
            {costBreakdown.map((item, index) => {
              const percentage = (item.cost_usd / totalCurrentCost) * 100;
              return (
                <div key={index} className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {item.category}
                      </span>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      {formatCurrency(item.cost_usd)}
                    </span>
                    <p className="text-xs text-gray-500">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Monthly Cost Trend */}
        <Card title="📈 月間コスト推移">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="storage_cost" 
                  stackId="a" 
                  fill="#3b82f6" 
                  name="ストレージ"
                />
                <Bar 
                  dataKey="operation_cost" 
                  stackId="a" 
                  fill="#10b981" 
                  name="オペレーション"
                />
                <Bar 
                  dataKey="retrieval_cost" 
                  stackId="a" 
                  fill="#f59e0b" 
                  name="取得"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed Cost Trend */}
      <Card title="📊 詳細コスト推移" className="mt-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_cost"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                name="総コスト"
              />
              <Line
                type="monotone"
                dataKey="storage_cost"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                name="ストレージ"
              />
              <Line
                type="monotone"
                dataKey="operation_cost"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                name="オペレーション"
              />
              <Line
                type="monotone"
                dataKey="retrieval_cost"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                name="取得料金"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Cost Optimization Tips */}
      <Card title="💡 コスト最適化のヒント" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-xl">🌱</span>
              <div>
                <h4 className="text-sm font-semibold text-green-900 mb-1">
                  Archive移行効果
                </h4>
                <p className="text-sm text-green-800">
                  30日経過後の自動Archive移行により、月額 {formatCurrency(savingsFromIA)} の節約を実現
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-xl">📊</span>
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  アクセスパターン最適化
                </h4>
                <p className="text-sm text-blue-800">
                  サムネイル表示でArchive取得を最小化し、コストを効率化
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-purple-500 text-xl">⚡</span>
              <div>
                <h4 className="text-sm font-semibold text-purple-900 mb-1">
                  予測コスト管理
                </h4>
                <p className="text-sm text-purple-800">
                  月末予測: {formatCurrency(projectedMonthEndCost)} 
                  {projectedMonthEndCost > 5 && (
                    <span className="text-red-600 ml-1">⚠️ 予算注意</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-gray-500 text-xl">🎯</span>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  効率的な利用
                </h4>
                <p className="text-sm text-gray-800">
                  無料枠10GB内での運用により、基本料金のみでの利用を継続
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CostAnalysis;
