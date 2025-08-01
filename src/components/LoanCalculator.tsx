import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Plus, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AmortizationRow {
  month: number;
  date: string;
  interestRate: number;
  startPrincipal: number;
  emiPaid: number;
  extraPaid: number;
  totalPaid: number;
  interestPaid: number;
  principalPaid: number;
  endPrincipal: number;
}

interface InterestRate {
  date: string;
  rate: number;
}

interface ExtraPayment {
  id: string;
  month: string;
  amount: number;
}

// Sortable Extra Payment Item Component
const SortableExtraPaymentItem = ({ payment, index, onUpdate, onRemove }: {
  payment: ExtraPayment;
  index: number;
  onUpdate: (index: number, field: 'month' | 'amount', value: string | number) => void;
  onRemove: (index: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: payment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center bg-card p-2 rounded border">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <Input
        type="month"
        value={payment.month}
        onChange={(e) => onUpdate(index, 'month', e.target.value)}
        className="flex-1"
        placeholder="Select month"
      />
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">₹</span>
        <Input
          type="number"
          value={payment.amount === 0 ? '' : payment.amount}
          onChange={(e) => {
            const value = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
            onUpdate(index, 'amount', value);
          }}
          className="w-24"
          placeholder="0"
          min="0"
        />
      </div>
      <Button
        onClick={() => onRemove(index)}
        size="sm"
        variant="outline"
        className="px-2"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

const LoanCalculator = () => {
  const { toast } = useToast();
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [monthlyEmi, setMonthlyEmi] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [defaultExtra, setDefaultExtra] = useState<string>('');
  const [interestRates, setInterestRates] = useState<InterestRate[]>([
    { date: '', rate: 0 }
  ]);
  const [extraPayments, setExtraPayments] = useState<ExtraPayment[]>([]);
  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addInterestRate = () => {
    setInterestRates([...interestRates, { date: '', rate: 0 }]);
  };

  const removeInterestRate = (index: number) => {
    if (interestRates.length > 1) {
      setInterestRates(interestRates.filter((_, i) => i !== index));
    }
  };

  const updateInterestRate = (index: number, field: 'date' | 'rate', value: string | number) => {
    const updated = [...interestRates];
    updated[index] = { ...updated[index], [field]: value };
    setInterestRates(updated);
  };

  const addExtraPayment = () => {
    const newId = `extra-${Date.now()}-${Math.random()}`;
    setExtraPayments([...extraPayments, { id: newId, month: '', amount: 0 }]);
  };

  const removeExtraPayment = (index: number) => {
    setExtraPayments(extraPayments.filter((_, i) => i !== index));
  };

  const updateExtraPayment = (index: number, field: 'month' | 'amount', value: string | number) => {
    const updated = [...extraPayments];
    updated[index] = { ...updated[index], [field]: value };
    setExtraPayments(updated);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setExtraPayments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getInterestRate = (currentDate: Date, interestSchedule: InterestRate[]): number => {
    const sortedSchedule = interestSchedule
      .filter(item => item.date && item.rate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (let i = sortedSchedule.length - 1; i >= 0; i--) {
      if (currentDate >= new Date(sortedSchedule[i].date)) {
        return sortedSchedule[i].rate / 100;
      }
    }
    return sortedSchedule[0]?.rate / 100 || 0.1;
  };

  const calculateAmortization = () => {
    if (!loanAmount || !monthlyEmi || !startDate) {
      toast({
        title: "Input Required",
        description: "Please fill in loan amount, monthly EMI, and start date",
        variant: "destructive",
      });
      return;
    }

    const loanAmountNum = parseFloat(loanAmount);
    const monthlyEmiNum = parseFloat(monthlyEmi);
    const defaultExtraNum = parseFloat(defaultExtra) || 0;

    if (loanAmountNum <= 0 || monthlyEmiNum <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid positive values for loan amount and EMI",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    
    try {
      const schedule: AmortizationRow[] = [];
      let outstanding = loanAmountNum;
      let currentDate = new Date(startDate);
      
      // Convert extra payments to a map
      const extraPaymentMap: { [key: string]: number } = {};
      extraPayments.forEach(payment => {
        if (payment.month && payment.amount >= 0) {
          extraPaymentMap[payment.month] = payment.amount;
        }
      });

      let month = 1;
      while (outstanding > 0 && month <= 1200) { // Safety limit
        const currentRate = getInterestRate(currentDate, interestRates);
        const monthlyRate = currentRate / 12;
        
        const interest = outstanding * monthlyRate;
        let principalPayment = monthlyEmiNum - interest;
        
        // Get extra payment for the current month
        const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM format
        const extraPayment = extraPaymentMap[monthKey] !== undefined ? extraPaymentMap[monthKey] : defaultExtraNum;
        let totalPrincipalPayment = principalPayment + extraPayment;
        
        // Handle overpayment correctly
        let totalPayment: number;
        let endBalance: number;
        let finalPrincipalPaid: number;
        
        if (totalPrincipalPayment >= outstanding) {
          totalPrincipalPayment = outstanding;
          const interest_recalc = outstanding * monthlyRate;
          principalPayment = outstanding - extraPayment > 0 ? outstanding - extraPayment : 0;
          totalPayment = interest_recalc + totalPrincipalPayment;
          endBalance = 0;
          finalPrincipalPaid = totalPrincipalPayment;
        } else {
          totalPayment = monthlyEmiNum + extraPayment;
          endBalance = outstanding - totalPrincipalPayment;
          finalPrincipalPaid = totalPrincipalPayment;
        }

        schedule.push({
          month,
          date: currentDate.toISOString().slice(0, 10),
          interestRate: Math.round(currentRate * 10000) / 100,
          startPrincipal: Math.round(outstanding * 100) / 100,
          emiPaid: monthlyEmiNum,
          extraPaid: extraPayment,
          totalPaid: Math.round(totalPayment * 100) / 100,
          interestPaid: Math.round(interest * 100) / 100,
          principalPaid: Math.round(finalPrincipalPaid * 100) / 100,
          endPrincipal: Math.round(endBalance * 100) / 100
        });

        outstanding = endBalance;
        
        // Move to next month - use same day of next month
        const year = currentDate.getFullYear();
        const monthNum = currentDate.getMonth();
        const day = currentDate.getDate();
        currentDate = new Date(year, monthNum + 1, day);
        month++;
      }

      setSchedule(schedule);
      toast({
        title: "Calculation Complete",
        description: `Generated ${schedule.length} month schedule`,
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: "Please check your inputs and try again",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const totalExtra = schedule.reduce((sum, row) => sum + row.extraPaid, 0);
  const totalPaid = schedule.reduce((sum, row) => sum + row.totalPaid, 0);

  return (
    <div className="min-h-screen bg-gradient-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Loan Amortization Calculator
          </h1>
          <p className="text-muted-foreground text-lg">
            Calculate your loan payment schedule with variable rates and extra payments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card className="shadow-strong">
            <CardHeader className="bg-gradient-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                Loan Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Basic Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="loanAmount">Loan Amount (₹)</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="mt-1"
                    placeholder="Enter loan amount"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="monthlyEmi">Monthly EMI (₹)</Label>
                  <Input
                    id="monthlyEmi"
                    type="number"
                    value={monthlyEmi}
                    onChange={(e) => setMonthlyEmi(e.target.value)}
                    className="mt-1"
                    placeholder="Enter monthly EMI"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultExtra">Default Extra Payment (₹)</Label>
                  <Input
                    id="defaultExtra"
                    type="number"
                    value={defaultExtra}
                    onChange={(e) => setDefaultExtra(e.target.value)}
                    className="mt-1"
                    placeholder="Enter default extra payment"
                    min="0"
                  />
                </div>
              </div>

              {/* Interest Rates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-lg font-semibold">Interest Rate Schedule</Label>
                  <Button
                    onClick={addInterestRate}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Rate
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {interestRates.map((rate, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={rate.date}
                        onChange={(e) => updateInterestRate(index, 'date', e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={rate.rate === 0 ? '' : rate.rate}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            updateInterestRate(index, 'rate', value);
                          }}
                          className="w-20"
                          placeholder="0"
                          min="0"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      {interestRates.length > 1 && (
                        <Button
                          onClick={() => removeInterestRate(index)}
                          size="sm"
                          variant="outline"
                          className="px-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Payments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-lg font-semibold">Extra Payments by Month</Label>
                  <Button
                    onClick={addExtraPayment}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={extraPayments.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      {extraPayments.map((payment, index) => (
                        <SortableExtraPaymentItem
                          key={payment.id}
                          payment={payment}
                          index={index}
                          onUpdate={updateExtraPayment}
                          onRemove={removeExtraPayment}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              </div>

              <Button 
                onClick={calculateAmortization}
                disabled={isCalculating}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Amortization Schedule'}
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          {schedule.length > 0 && (
            <Card className="shadow-strong">
              <CardHeader className="bg-gradient-secondary text-white">
                <CardTitle>Loan Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      ₹{parseFloat(loanAmount || '0').toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Principal Amount</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-destructive">
                      ₹{Math.round(totalInterest).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Interest</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-secondary">
                      ₹{Math.round(totalExtra).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Extra Payments</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      ₹{Math.round(totalPaid).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                  </div>
                  <div className="col-span-2 text-center p-4 bg-primary text-primary-foreground rounded-lg">
                    <div className="text-3xl font-bold">
                      {schedule.length} months
                    </div>
                    <div className="text-sm opacity-90">Loan Duration</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Table */}
        {schedule.length > 0 && (
          <Card className="shadow-strong animate-fade-in">
            <CardHeader>
              <CardTitle>Amortization Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">Month</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Rate %</th>
                      <th className="text-right p-2">Start Principal</th>
                      <th className="text-right p-2">EMI</th>
                      <th className="text-right p-2">Extra</th>
                      <th className="text-right p-2">Total Paid</th>
                      <th className="text-right p-2">Interest</th>
                      <th className="text-right p-2">Principal</th>
                      <th className="text-right p-2">End Principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row) => (
                      <tr key={row.month} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{row.month}</td>
                        <td className="p-2">{row.date}</td>
                        <td className="p-2">{row.interestRate}%</td>
                        <td className="p-2 text-right">₹{row.startPrincipal.toLocaleString()}</td>
                        <td className="p-2 text-right">₹{row.emiPaid.toLocaleString()}</td>
                        <td className="p-2 text-right text-secondary">₹{row.extraPaid.toLocaleString()}</td>
                        <td className="p-2 text-right font-medium">₹{row.totalPaid.toLocaleString()}</td>
                        <td className="p-2 text-right text-destructive">₹{row.interestPaid.toLocaleString()}</td>
                        <td className="p-2 text-right text-primary">₹{row.principalPaid.toLocaleString()}</td>
                        <td className="p-2 text-right">₹{row.endPrincipal.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm">
            This tool is for educational purposes only. Actual loan details may vary from bank to bank.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoanCalculator;