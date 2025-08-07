import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calculator, Plus, Trash2, GripVertical, Info, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import LoanCharts from './LoanCharts';
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
  const { t } = useLanguage();
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
        placeholder={t('table.month')}
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
  const { t } = useLanguage();
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [calculationMode, setCalculationMode] = useState<'fixed-emi' | 'tenure'>('fixed-emi');
  const [fixedEmi, setFixedEmi] = useState<string>('');
  const [tenureMonths, setTenureMonths] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [defaultExtra, setDefaultExtra] = useState<string>('');
  const [defaultExtraInterval, setDefaultExtraInterval] = useState<string>('1');
  const [interestRates, setInterestRates] = useState<InterestRate[]>([
    { date: '', rate: 0 }
  ]);
  const [extraPayments, setExtraPayments] = useState<ExtraPayment[]>([]);
  const [schedule, setSchedule] = useState<AmortizationRow[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [tooltipStates, setTooltipStates] = useState<{ [key: string]: boolean }>({});

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

  const toggleTooltip = (key: string) => {
    setTooltipStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const closeTooltip = (key: string) => {
    setTooltipStates(prev => ({
      ...prev,
      [key]: false
    }));
  };

  const getInterestRate = (currentDate: Date, interestSchedule: InterestRate[]): number => {
    const sortedSchedule = interestSchedule
      .filter(item => item.date && item.rate)
      .map(item => [new Date(item.date), item.rate / 100] as [Date, number])
      .sort((a, b) => a[0].getTime() - b[0].getTime());
    
    for (let i = sortedSchedule.length - 1; i >= 0; i--) {
      if (currentDate >= sortedSchedule[i][0]) {
        return sortedSchedule[i][1];
      }
    }
    return sortedSchedule[0]?.[1] || 0.1;
  };

  const calculateMonthlyEmi = (principal: number, monthlyRate: number, monthsLeft: number): number => {
    if (monthlyRate === 0) {
      return principal / monthsLeft;
    }
    return principal * monthlyRate * Math.pow(1 + monthlyRate, monthsLeft) / (Math.pow(1 + monthlyRate, monthsLeft) - 1);
  };

  const calculateAmortization = () => {
    if (!loanAmount || !startDate) {
      toast({
        title: t('error.inputRequired'),
        description: t('error.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'fixed-emi' && !fixedEmi) {
      toast({
        title: t('error.inputRequired'),
        description: t('error.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'tenure' && !tenureMonths) {
      toast({
        title: t('error.inputRequired'),
        description: t('error.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    const loanAmountNum = parseFloat(loanAmount);
    const fixedEmiNum = calculationMode === 'fixed-emi' ? parseFloat(fixedEmi) : null;
    const tenureMonthsNum = calculationMode === 'tenure' ? parseInt(tenureMonths) : null;
    const defaultExtraNum = parseFloat(defaultExtra) || 0;
    const defaultExtraIntervalNum = parseInt(defaultExtraInterval) || 1;

    if (loanAmountNum <= 0) {
      toast({
        title: t('error.invalidInput'),
        description: t('error.positiveValues'),
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'fixed-emi' && (fixedEmiNum === null || fixedEmiNum <= 0)) {
      toast({
        title: t('error.invalidInput'),
        description: t('error.positiveValues'),
        variant: "destructive",
      });
      return;
    }

    if (calculationMode === 'tenure' && (tenureMonthsNum === null || tenureMonthsNum <= 0)) {
      toast({
        title: t('error.invalidInput'),
        description: t('error.positiveValues'),
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
        const rate = getInterestRate(currentDate, interestRates);
        const mrate = rate / 12;

        // Determine EMI
        let emi: number;
        if (tenureMonthsNum !== null) {
          const monthsLeft = Math.max(tenureMonthsNum - (month - 1), 1);
          emi = calculateMonthlyEmi(outstanding, mrate, monthsLeft);
        } else {
          if (fixedEmiNum === null) {
            throw new Error("Fixed EMI is required for payoff mode");
          }
          emi = fixedEmiNum;
        }

        // Interest & principal from EMI
        const interest = outstanding * mrate;
        const principalFromEmi = Math.max(emi - interest, 0);

        // Determine extra payment for this month
        const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM format
        let extraPaymentThisMonth: number;
        if (extraPaymentMap[monthKey] !== undefined) {
          extraPaymentThisMonth = extraPaymentMap[monthKey];
        } else {
          // Apply default extra payment based on interval
          extraPaymentThisMonth = (month % defaultExtraIntervalNum === 0) ? defaultExtraNum : 0;
        }
        
        // Cap extra so we never overpay principal
        const maxExtra = Math.max(outstanding - principalFromEmi, 0);
        const extra = Math.min(extraPaymentThisMonth, maxExtra);

        // Final payment logic in early payoff
        let emiPaid: number;
        let extraPaid: number;
        let totalPrincipal: number;
        let totalPaid: number;
        let endBalance: number;

        if (tenureMonthsNum === null && principalFromEmi + extra >= outstanding) {
          const interestRecalc = outstanding * mrate;
          const principalFromEmiRecalc = Math.max(outstanding - extra, 0);
          emiPaid = Math.round((interestRecalc + principalFromEmiRecalc) * 100) / 100;
          extraPaid = Math.round(extra * 100) / 100;
          totalPrincipal = principalFromEmiRecalc + extraPaid;
          totalPaid = Math.round((interestRecalc + totalPrincipal) * 100) / 100;
          endBalance = 0.0;
        } else {
          emiPaid = Math.round(emi * 100) / 100;
          extraPaid = Math.round(extra * 100) / 100;
          totalPrincipal = principalFromEmi + extra;
          totalPaid = Math.round((emiPaid + extraPaid) * 100) / 100;
          endBalance = outstanding - totalPrincipal;
        }

        // Fix any negative zero
        endBalance = Math.round(endBalance * 100) / 100;
        if (Math.abs(endBalance) < 1e-9) {
          endBalance = 0.0;
        }

        schedule.push({
          month,
          paymentDate: currentDate.toISOString().slice(0, 10),
          annualInterestRate: Math.round(rate * 10000) / 100,
          openingBalance: Math.round(outstanding * 100) / 100,
          monthlyEmi: emiPaid,
          extraPayment: extraPaid,
          totalPaymentThisMonth: totalPaid,
          interestPaid: Math.round(interest * 100) / 100,
          principalPaid: Math.round(totalPrincipal * 100) / 100,
          remainingBalance: endBalance
        });

        outstanding = endBalance;
        if (outstanding <= 0) {
          break;
        }

        // Move to next month
        const year = currentDate.getFullYear();
        const monthNum = currentDate.getMonth();
        const day = currentDate.getDate();
        
        // Get the last day of current month, then add days to get to next month
        const lastDay = new Date(year, monthNum + 1, 0).getDate();
        currentDate = new Date(year, monthNum + 1, day);
        
        month++;
      }

      setSchedule(schedule);
      toast({
        title: t('success.calculationComplete'),
        description: t('success.generatedSchedule').replace('{count}', schedule.length.toString()),
      });
    } catch (error) {
      toast({
        title: t('error.calculationError'),
        description: t('error.checkInputs'),
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPaid, 0);
  const totalExtra = schedule.reduce((sum, row) => sum + row.extraPayment, 0);
  const totalPaid = schedule.reduce((sum, row) => sum + row.totalPaymentThisMonth, 0);
  const totalEmiPayments = schedule.reduce((sum, row) => sum + row.monthlyEmi, 0);

  return (
    <div className="min-h-screen bg-gradient-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {t('amortization.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('tooltip.loanAmount')}
          </p>
        </div>

        {/* Centered and wider Loan Parameters */}
        <div className="flex justify-center">
          <Card className="shadow-strong w-full max-w-4xl">
            <CardHeader className="bg-gradient-primary text-white">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                {t('loan.parameters')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Calculation Mode */}
              <div>
                <Label className="text-lg font-semibold">{t('calculation.mode')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    onClick={() => setCalculationMode('fixed-emi')}
                    variant={calculationMode === 'fixed-emi' ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {t('emi.monthlyEmi')}
                  </Button>
                  <Button
                    onClick={() => setCalculationMode('tenure')}
                    variant={calculationMode === 'tenure' ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {t('loan.tenure')}
                  </Button>
                </div>
              </div>

              {/* Basic Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="loanAmount">{t('loan.amount')}</Label>
                    <TooltipProvider>
                      <Tooltip open={tooltipStates.loanAmount}>
                        <TooltipTrigger 
                          onClick={() => toggleTooltip('loanAmount')}
                          onMouseEnter={() => setTooltipStates(prev => ({ ...prev, loanAmount: true }))}
                          onMouseLeave={() => setTooltipStates(prev => ({ ...prev, loanAmount: false }))}
                        >
                          <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent 
                          onPointerDownOutside={() => closeTooltip('loanAmount')}
                          onEscapeKeyDown={() => closeTooltip('loanAmount')}
                        >
                          <p>{t('tooltip.loanAmount')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="loanAmount"
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="mt-1"
                    placeholder={t('loan.amount')}
                    min="0"
                  />
                </div>
                {calculationMode === 'fixed-emi' ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="fixedEmi">{t('emi.monthlyEmi')} (₹)</Label>
                      <TooltipProvider>
                        <Tooltip open={tooltipStates.fixedEmi}>
                          <TooltipTrigger 
                            onClick={() => toggleTooltip('fixedEmi')}
                            onMouseEnter={() => setTooltipStates(prev => ({ ...prev, fixedEmi: true }))}
                            onMouseLeave={() => setTooltipStates(prev => ({ ...prev, fixedEmi: false }))}
                          >
                            <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent 
                            onPointerDownOutside={() => closeTooltip('fixedEmi')}
                            onEscapeKeyDown={() => closeTooltip('fixedEmi')}
                          >
                            <p>{t('tooltip.loanAmount')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="fixedEmi"
                      type="number"
                      value={fixedEmi}
                      onChange={(e) => setFixedEmi(e.target.value)}
                      className="mt-1"
                      placeholder={t('emi.monthlyEmi')}
                      min="0"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="tenureMonths">{t('loan.tenure')}</Label>
                      <TooltipProvider>
                        <Tooltip open={tooltipStates.tenureMonths}>
                          <TooltipTrigger 
                            onClick={() => toggleTooltip('tenureMonths')}
                            onMouseEnter={() => setTooltipStates(prev => ({ ...prev, tenureMonths: true }))}
                            onMouseLeave={() => setTooltipStates(prev => ({ ...prev, tenureMonths: false }))}
                          >
                            <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent 
                            onPointerDownOutside={() => closeTooltip('tenureMonths')}
                            onEscapeKeyDown={() => closeTooltip('tenureMonths')}
                          >
                            <p>{t('tooltip.tenure')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="tenureMonths"
                      type="number"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="mt-1"
                      placeholder={t('ui.placeholder.enterTenure')}
                      min="1"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="startDate">{t('loan.startDate')}</Label>
                    <TooltipProvider>
                      <Tooltip open={tooltipStates.startDate}>
                        <TooltipTrigger 
                          onClick={() => toggleTooltip('startDate')}
                          onMouseEnter={() => setTooltipStates(prev => ({ ...prev, startDate: true }))}
                          onMouseLeave={() => setTooltipStates(prev => ({ ...prev, startDate: false }))}
                        >
                          <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent 
                          onPointerDownOutside={() => closeTooltip('startDate')}
                          onEscapeKeyDown={() => closeTooltip('startDate')}
                        >
                          <p>{t('tooltip.startDate')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Interest Rates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-semibold">{t('calculation.interestRateSchedule')}</Label>
                    <TooltipProvider>
                      <Tooltip open={tooltipStates.interestRate}>
                        <TooltipTrigger 
                          onClick={() => toggleTooltip('interestRate')}
                          onMouseEnter={() => setTooltipStates(prev => ({ ...prev, interestRate: true }))}
                          onMouseLeave={() => setTooltipStates(prev => ({ ...prev, interestRate: false }))}
                        >
                          <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent 
                          onPointerDownOutside={() => closeTooltip('interestRate')}
                          onEscapeKeyDown={() => closeTooltip('interestRate')}
                        >
                          <p>{t('tooltip.interestRateSchedule')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button
                    onClick={addInterestRate}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {t('amortization.addRate')}
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

              {/* Advanced Options */}
              <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
                <div className="border rounded-lg p-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                      <div className="flex items-center gap-2">
                        <Label className="text-lg font-semibold cursor-pointer">{t('amortization.advancedOptions')}</Label>
                        <TooltipProvider>
                          <Tooltip open={tooltipStates.advanced}>
                            <TooltipTrigger 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTooltip('advanced');
                              }}
                              onMouseEnter={() => setTooltipStates(prev => ({ ...prev, advanced: true }))}
                              onMouseLeave={() => setTooltipStates(prev => ({ ...prev, advanced: false }))}
                            >
                              <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent 
                              onPointerDownOutside={() => closeTooltip('advanced')}
                              onEscapeKeyDown={() => closeTooltip('advanced')}
                            >
                              <p>{t('tooltip.advancedOptions')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-4 mt-4">
                    {/* Default Extra Payment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="defaultExtra">{t('calculation.defaultExtraPayment')} (₹)</Label>
                          <TooltipProvider>
                            <Tooltip open={tooltipStates.defaultExtra}>
                              <TooltipTrigger 
                                onClick={() => toggleTooltip('defaultExtra')}
                                onMouseEnter={() => setTooltipStates(prev => ({ ...prev, defaultExtra: true }))}
                                onMouseLeave={() => setTooltipStates(prev => ({ ...prev, defaultExtra: false }))}
                              >
                                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent 
                                onPointerDownOutside={() => closeTooltip('defaultExtra')}
                                onEscapeKeyDown={() => closeTooltip('defaultExtra')}
                              >
                                <p>{t('tooltip.defaultExtraPayment')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
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
                      <div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="defaultExtraInterval">{t('calculation.defaultExtraInterval')}</Label>
                          <TooltipProvider>
                            <Tooltip open={tooltipStates.defaultExtraInterval}>
                              <TooltipTrigger 
                                onClick={() => toggleTooltip('defaultExtraInterval')}
                                onMouseEnter={() => setTooltipStates(prev => ({ ...prev, defaultExtraInterval: true }))}
                                onMouseLeave={() => setTooltipStates(prev => ({ ...prev, defaultExtraInterval: false }))}
                              >
                                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent 
                                onPointerDownOutside={() => closeTooltip('defaultExtraInterval')}
                                onEscapeKeyDown={() => closeTooltip('defaultExtraInterval')}
                              >
                                <p>{t('tooltip.defaultExtraInterval')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          id="defaultExtraInterval"
                          type="number"
                          value={defaultExtraInterval}
                          onChange={(e) => setDefaultExtraInterval(e.target.value)}
                          className="mt-1"
                          placeholder="1"
                          min="1"
                        />
                      </div>
                    </div>

                    {/* Extra Payments by Month */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-lg font-semibold">{t('calculation.extraPaymentsByMonth')}</Label>
                          <TooltipProvider>
                            <Tooltip open={tooltipStates.extraPayments}>
                              <TooltipTrigger 
                                onClick={() => toggleTooltip('extraPayments')}
                                onMouseEnter={() => setTooltipStates(prev => ({ ...prev, extraPayments: true }))}
                                onMouseLeave={() => setTooltipStates(prev => ({ ...prev, extraPayments: false }))}
                              >
                                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent 
                                onPointerDownOutside={() => closeTooltip('extraPayments')}
                                onEscapeKeyDown={() => closeTooltip('extraPayments')}
                              >
                                <p>{t('tooltip.extraPaymentsByMonth')}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Button
                          onClick={addExtraPayment}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          {t('amortization.addPayment')}
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
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Button 
                onClick={calculateAmortization}
                disabled={isCalculating}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {isCalculating ? t('ui.calculating') : t('loan.calculate')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Amortization Schedule Table */}
        {schedule.length > 0 && (
          <Card className="shadow-strong animate-fade-in">
            <CardHeader>
              <CardTitle>{t('amortization.schedule')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold">{t('table.month')}</th>
                      <th className="text-left p-3 font-semibold">{t('table.date')}</th>
                      <th className="text-left p-3 font-semibold">{t('table.rate')}</th>
                      <th className="text-right p-3 font-semibold">{t('table.openingBalance')}</th>
                      <th className="text-right p-3 font-semibold">{t('table.emi')}</th>
                      <th className="text-right p-3 font-semibold">{t('table.extraPayment')}</th>
                      <th className="text-right p-3 font-semibold">{t('table.totalPayment')}</th>
                      <th className="text-right p-3 font-semibold">{t('table.interestPaid')}</th>
                      <th className="text-right p-3 font-semibold">{t('table.principalPaid')}</th>
                      <th className="text-right p-3 font-semibold">{t('table.remainingBalance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row, index) => (
                      <tr key={row.month} className={`border-b hover:bg-muted/20 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                        <td className="p-3 font-medium">{row.month}</td>
                        <td className="p-3">{new Date(row.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {row.annualInterestRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-right">₹{row.openingBalance.toLocaleString()}</td>
                        <td className="p-3 text-right">₹{row.monthlyEmi.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          {row.extraPayment > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                              ₹{row.extraPayment.toLocaleString()}
                            </span>
                          ) : (
                            "₹0"
                          )}
                        </td>
                        <td className="p-3 text-right font-medium">₹{row.totalPaymentThisMonth.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            ₹{row.interestPaid.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            ₹{row.principalPaid.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">₹{row.remainingBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loan Summary */}
        {schedule.length > 0 && (
          <Card className="shadow-strong">
            <CardHeader className="bg-gradient-secondary text-white">
              <CardTitle>{t('amortization.summary')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h3 className="text-sm font-medium text-primary">{t('loan.amount')}</h3>
                  <p className="text-xl font-bold text-primary">₹{parseFloat(loanAmount || '0').toLocaleString()}</p>
                </div>
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <h3 className="text-sm font-medium text-destructive">{t('summary.totalInterest')}</h3>
                  <p className="text-xl font-bold text-destructive">₹{Math.round(totalInterest).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">{t('summary.totalExtraPayments')}</h3>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">₹{Math.round(totalExtra).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <h3 className="text-sm font-medium text-green-700 dark:text-green-300">{t('emi.monthlyEmi')}</h3>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">₹{Math.round(totalEmiPayments).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted border rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground">{t('summary.totalAmount')}</h3>
                  <p className="text-xl font-bold text-foreground">₹{Math.round(totalPaid).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('loan.tenure')}</h3>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{schedule.length} {t('summary.months')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {schedule.length > 0 && (
          <LoanCharts schedule={schedule} loanAmount={parseFloat(loanAmount || '0')} />
        )}

        {/* Disclaimer */}
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm">
            {t('ui.educationalPurpose')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoanCalculator;