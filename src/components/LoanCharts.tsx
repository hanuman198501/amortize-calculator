import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AmortizationRow {
  month: number;
  paymentDate: string;
  annualInterestRate: number;
  openingBalance: number;
  monthlyEmi: number;
  extraPayment: number;
  totalPaymentThisMonth: number;
  interestPaid: number;
  principalPaid: number;
  remainingBalance: number;
}

interface LoanChartsProps {
  schedule: AmortizationRow[];
  loanAmount: number;
}

const COLORS = {
  principal: 'hsl(var(--primary))',
  interest: 'hsl(var(--destructive))',
  extra: 'hsl(var(--secondary))',
};

const LoanCharts: React.FC<LoanChartsProps> = ({ schedule, loanAmount }) => {
  if (!schedule.length) return null;

  // Calculate totals for pie chart
  const totalPrincipal = loanAmount;
  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const totalExtra = schedule.reduce((sum, row) => sum + row.extraPayment, 0);

  const pieData = [
    { name: 'Principal', value: totalPrincipal, color: COLORS.principal },
    { name: 'Interest', value: totalInterest, color: COLORS.interest },
    { name: 'Extra Payments', value: totalExtra, color: COLORS.extra },
  ].filter(item => item.value > 0);

  // Prepare cumulative data for line chart
  const cumulativeData = schedule.map((row, index) => {
    const cumulativeInterest = schedule.slice(0, index + 1).reduce((sum, r) => sum + r.interestPaid, 0);
    const cumulativePrincipal = schedule.slice(0, index + 1).reduce((sum, r) => sum + r.principalPaid, 0);
    
    return {
      month: row.month,
      cumulativeInterest,
      cumulativePrincipal,
      remainingBalance: row.remainingBalance,
    };
  });

  // Balance over time data
  const balanceData = schedule.map(row => ({
    month: row.month,
    balance: row.remainingBalance,
  }));

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Position for percentage inside the slice
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Position for amount outside the slice
    const labelRadius = outerRadius + 30;
    const labelX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
    const labelY = cy + labelRadius * Math.sin(-midAngle * RADIAN);
    
    return (
      <g>
        {/* Percentage inside */}
        <text 
          x={x} 
          y={y} 
          fill="white" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          className="font-semibold text-sm"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        {/* Amount outside */}
        <text 
          x={labelX} 
          y={labelY} 
          fill="hsl(var(--foreground))" 
          textAnchor={labelX > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          className="text-xs font-medium"
        >
          {`₹${Math.round(value).toLocaleString()}`}
        </text>
      </g>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Payment Breakdown Pie Chart */}
      <Card className="shadow-strong">
        <CardHeader className="relative">
          <CardTitle>Payment Breakdown</CardTitle>
          {/* Legend in top-right */}
          <div className="absolute top-4 right-4 flex flex-col space-y-1 text-xs">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cumulative Payments Line Chart */}
      <Card className="shadow-strong">
        <CardHeader>
          <CardTitle>Cumulative Interest vs Principal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, '']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cumulativeInterest" 
                stroke={COLORS.interest} 
                strokeWidth={2}
                name="Cumulative Interest"
              />
              <Line 
                type="monotone" 
                dataKey="cumulativePrincipal" 
                stroke={COLORS.principal} 
                strokeWidth={2}
                name="Cumulative Principal"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Remaining Balance Chart */}
      <Card className="shadow-strong lg:col-span-2">
        <CardHeader>
          <CardTitle>Remaining Balance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(value: number) => [`₹${Math.round(value).toLocaleString()}`, 'Remaining Balance']} />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke={COLORS.principal} 
                strokeWidth={3}
                fill={COLORS.principal}
                fillOpacity={0.1}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanCharts;