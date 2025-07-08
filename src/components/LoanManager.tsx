import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Edit, Trash2, Calendar, DollarSign, User, CreditCard, Clock, TrendingUp, AlertTriangle, Clock10, ThumbsUp, Lightbulb, History, Undo2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createLoan, updateLoan, deleteLoan, reversePayment } from '@/lib/database';
import PaymentCollectionDialog from './PaymentCollectionDialog';
import ReversePaymentDialog from './ReversePaymentDialog';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Loan {
  id: string;
  borrower_id: string;
  borrowerName?: string;
  principal_amount: number;
  interest_rate: number;
  duration_months: number;
  total_amount: number;
  amount_paid: number;
  start_date: string;
  status: 'active' | 'completed' | 'overdue';
  next_payment_date?: string;
}

interface Borrower {
  id: string;
  name: string;
  phone: string;
  address: string;
}

interface LoanManagerProps {
  language: string;
  loans: Loan[];
  borrowers: Borrower[];
  onDataChange: () => void;
}

const LoanManager = ({ language, loans, borrowers, onDataChange }: LoanManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reversePaymentOpen, setReversePaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    borrower_id: '',
    principal_amount: '',
    interest_rate: '15',
    duration_months: '1',
    start_date: new Date().toISOString().split('T')[0]
  });

  const [search, setSearch] = useState('');
  // Add state for status filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');

  // Track original principal for edit validation
  const [originalPrincipal, setOriginalPrincipal] = useState<number | null>(null);
  const [editAmountError, setEditAmountError] = useState<string | null>(null);

  const translations = {
    en: {
      title: 'Loan Management',
      addLoan: 'Add New Loan',
      editLoan: 'Edit Loan',
      borrower: 'Borrower',
      principalAmount: 'Loan Amount',
      interestRate: 'Interest Rate(%)',
      duration: 'Loan Duration (months)',
      startDate: 'Start Date',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      collectPayment: 'Collect Payment',
      paymentHistory: 'Payment History',
      totalAmount: 'Total Amount',
      amountPaid: 'Paid Amount',
      remainingAmount: 'Remain Amount',
      status: 'Status',
      nextPayment: 'End Date',
      loanAdded: 'Loan added successfully',
      loanUpdated: 'Loan updated successfully',
      loanDeleted: 'Loan deleted successfully',
      fillAllFields: 'Please fill all fields',
      noLoans: 'No loans registered yet',
      selectBorrower: 'Select a borrower',
      confirmDelete: 'Are you sure you want to delete this loan?',
      deleteWarning: 'This action cannot be undone and will also delete all associated payments.',
      active: 'Active',
      completed: 'Completed',
      overdue: 'Overdue',
      paymentProgress: 'Payment Progress',
      daysRemaining: 'D',
      dailyPayment: 'D.Pay:'
    },
    ta: {
      title: 'கடன் மேலாண்மை',
      addLoan: 'புதிய கடன் சேர்க்கவும்',
      editLoan: 'கடனைத் திருத்தவும்',
      borrower: 'கடன் வாங்குபவர்',
      principalAmount: 'முதன்மை தொகை',
      interestRate: 'வட்டி விகிதம் (%)',
      duration: 'காலம் (மாதங்கள்)',
      startDate: 'தொடக்க தேதி',
      save: 'சேமிக்கவும்',
      cancel: 'ரத்து செய்யவும்',
      edit: 'திருத்து',
      delete: 'நீக்கு',
      collectPayment: 'பணம் வசூலிக்கவும்',
      paymentHistory: 'பணம் செலுத்தல் வரலாறு',
      totalAmount: 'மொத்த தொகை',
      amountPaid: 'செலுத்திய தொகை',
      remainingAmount: 'மீதமுள்ள தொகை',
      status: 'நிலை',
      nextPayment: 'கடன் முடிவு தேதி',
      loanAdded: 'கடன் வெற்றிகரமாக சேர்க்கப்பட்டது',
      loanUpdated: 'கடன் வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
      loanDeleted: 'கடன் வெற்றிகரமாக நீக்கப்பட்டது',
      fillAllFields: 'தயவுசெய்து அனைத்து புலங்களையும் நிரப்பவும்',
      noLoans: 'இதுவரை கடன்கள் பதிவு செய்யப்படவில்லை',
      selectBorrower: 'கடன் வாங்குபவரை தேர்ந்தெடுக்கவும்',
      confirmDelete: 'இந்த கடனை நீக்க விரும்புகிறீர்களா?',
      deleteWarning: 'இந்த செயல் மாற்ற முடியாது மற்றும் அனைத்து தொடர்புடைய பணம் செலுத்தல்களையும் நீக்கும்.',
      active: 'செயலில்',
      completed: 'முடிந்தது',
      overdue: 'தாமதம்',
      paymentProgress: 'பணம் செலுத்தல் முன்னேற்றம்',
      daysRemaining: 'மீதமுள்ள நாட்கள்',
      dailyPayment: 'தினசரி பணம் செலுத்தும் தொகை'
    }
  };

  const t = translations[language as keyof typeof translations];

  const handleSubmit = async () => {
    if (!formData.borrower_id || !formData.principal_amount || !formData.interest_rate ||
      !formData.duration_months || !formData.start_date) {
      toast({ title: t.fillAllFields, variant: "destructive" });
      return;
    }

    // Only prevent new loan if the borrower has an active or overdue loan (allow if all are completed)
    const existingActiveLoan = loans.find(
      (loan) =>
        loan.borrower_id === formData.borrower_id &&
        loan.status !== 'completed'
    );
    if (existingActiveLoan && !editingLoan) {
      toast({
        title: language === 'ta'
          ? 'இந்த கடன் வாங்குபவருக்கு முடிக்கப்படாத கடன் உள்ளது'
          : 'This borrower has an unfinished loan',
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setIsLoading(true);
    try {
      const principalAmount = parseFloat(formData.principal_amount);
      const interestRate = parseFloat(formData.interest_rate);
      const durationInMonths = parseInt(formData.duration_months);

      // If editing and payments have been made, prevent decreasing principal
      if (editingLoan && editingLoan.amount_paid > 0) {
        if (principalAmount < (originalPrincipal ?? editingLoan.principal_amount)) {
          setEditAmountError(
            language === 'ta'
              ? 'பணம் செலுத்தல் தொடங்கிய பிறகு கடன் தொகையை குறைக்க முடியாது'
              : 'Cannot decrease loan amount after payments have started'
          );
          return;
        }
      }
      setEditAmountError(null);

      const loanData = {
        borrower_id: formData.borrower_id,
        principal_amount: principalAmount,
        interest_rate: interestRate,
        duration_months: durationInMonths,
        total_amount: principalAmount + (principalAmount * interestRate / 100),
        start_date: formData.start_date,
        status: 'active' as const
      };

      if (editingLoan) {
        await updateLoan(editingLoan.id, loanData);
        toast({ title: t.loanUpdated });
      } else {
        await createLoan(loanData);
        toast({ title: t.loanAdded });
      }
      onDataChange();
      resetForm();
    } catch (error) {
      console.error('Error saving loan:', error);
      toast({
        title: "Error",
        description: "Failed to save loan. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setOriginalPrincipal(loan.principal_amount);
    setEditAmountError(null);
    setFormData({
      borrower_id: loan.borrower_id,
      principal_amount: loan.principal_amount.toString(),
      interest_rate: loan.interest_rate.toString(),
      duration_months: loan.duration_months.toString(),
      start_date: loan.start_date
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (loan: Loan) => {
    // Only allow delete if loan is completed
    if (loan.status !== 'completed') {
      toast({
        title: language === 'ta'
          ? 'முடிக்கப்படாத கடனை நீக்க முடியாது'
          : 'Cannot delete a loan that is not completed',
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    setLoanToDelete(loan);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!loanToDelete) return;

    setIsLoading(true);
    try {
      await deleteLoan(loanToDelete.id);
      toast({ title: t.loanDeleted });
      onDataChange();
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast({
        title: "Error",
        description: "Failed to delete loan. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
      setDeleteConfirmOpen(false);
      setLoanToDelete(null);
    }
  };

  const handleCollectPayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentDialogOpen(true);
  };

  const handleReversePayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setReversePaymentOpen(true);
  };

  const handlePaymentReversed = () => {
    onDataChange(); // Refresh loan data to update the table
  };

  const resetForm = () => {
    setFormData({
      borrower_id: '',
      principal_amount: '',
      interest_rate: '15',
      duration_months: '1',
      start_date: new Date().toISOString().split('T')[0]
    });
    setEditingLoan(null);
    setIsDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t.active;
      case 'completed':
        return t.completed;
      case 'overdue':
        return t.overdue;
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <ThumbsUp className="w-3 h-3" />;
      case 'completed':
        return <Lightbulb className="w-3 h-3" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const calculateProgress = (amountPaid: number, totalAmount: number) => {
    return Math.round((amountPaid / totalAmount) * 100);
  };

  const calculateDaysRemaining = (startDate: string, durationMonths: number) => {
    const start = new Date(startDate);
    const actualDays = durationMonths * 30;
    const end = new Date(start);
    end.setDate(end.getDate() + actualDays);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateArrears = (loan: Loan) => {
    const today = new Date();
    const startDate = new Date(loan.start_date);
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate daily payment amount
    const dailyPayment = loan.total_amount / (loan.duration_months * 30);
    
    // Calculate how much should have been paid by now
    const expectedPaymentByNow = Math.min(dailyPayment * daysSinceStart, loan.total_amount);
    
    // Calculate arrears (difference between expected and actual payments)
    const arrears = Math.max(0, expectedPaymentByNow - loan.amount_paid);
    
    return arrears;
  };

  const calculateMissedDays = (loan: Loan) => {
    const dailyPayment = loan.total_amount / (loan.duration_months * 30);
    const arrears = calculateArrears(loan);
    return Math.floor(arrears / dailyPayment);
  };

  const calculateLoanEndDate = (startDate: string, durationMonths: number) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    return end.toISOString().split('T')[0];
  };

  const filteredLoans = loans.filter((loan) => {
    // Filter by status
    if (statusFilter !== 'all' && loan.status !== statusFilter) return false;
    // ...existing code...
    const borrowerName = loan.borrowerName || '';
    const principal = loan.principal_amount.toString();
    const status = loan.status || '';
    return (
      borrowerName.toLowerCase().includes(search.toLowerCase()) ||
      principal.includes(search) ||
      status.toLowerCase().includes(search.toLowerCase())
    );
  }).sort((a, b) => {
    // Sort completed loans to the bottom
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    // Within same status, sort by start_date (newest first)
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });
  
  // Utility function to format display name like BorrowerManager
  const formatDisplayName = (borrower: Borrower) => {
    if (borrower.name) {
      const parts = borrower.name.trim().split(" ");
      if (parts.length === 3) {
        const first = parts[0];
        const second = parts[1].charAt(0).toUpperCase() + ".";
        const third = parts[2];
        return `${first} ${second} ${third}`;
      }
      return borrower.name;
    }
    return "Unknown Borrower";
  };

  return (
    <div className="p-6 space-y-6 pt-5">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-left text-gray-800 dark:text-gray-200 flex-1">
          {t.title}
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingLoan(null)}
              className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-3 py-2 text-sm md:text-base flex items-center gap-2"
            >
              <Plus className="w-4 h-4 mr-0" />
              <span className="hidden sm:inline">{t.addLoan}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-0 gap-0 overflow-hidden dialogContentClassName">
            <DialogHeader className="px-6 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <DialogTitle className="flex text-xl font-semibold items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                {editingLoan ? t.editLoan : t.addLoan}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 px-6 py-6">
              <div className="flex flex-col gap-1 pb-2">
                <Label htmlFor="borrower" className="flex items-center gap-2 pb-1">
                  <User className="w-4 h-4" />
                  {t.borrower}
                </Label>
                <Select
                  value={formData.borrower_id}
                  onValueChange={(value) => setFormData({ ...formData, borrower_id: value })}
                  disabled={!!editingLoan}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder={t.selectBorrower} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                    {editingLoan
                      ? (
                        (() => {
                          const borrower = borrowers.find(b => b.id === formData.borrower_id);
                          return borrower ? (
                            <SelectItem key={borrower.id} value={borrower.id}>
                              {formatDisplayName(borrower)}
                            </SelectItem>
                          ) : null;
                        })()
                      )
                      : (
                        borrowers
                          // Only allow borrowers who do not have an active or overdue loan
                          .filter((borrower) =>
                            !loans.some(
                              (loan) =>
                                loan.borrower_id === borrower.id &&
                                loan.status !== 'completed'
                            )
                          )
                          .map((borrower) => (
                            <SelectItem key={borrower.id} value={borrower.id}>
                              {formatDisplayName(borrower)}
                            </SelectItem>
                          ))
                      )
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 pb-2">
                <Label htmlFor="principal" className="flex items-center gap-2 pb-1">
                  <DollarSign className="w-4 h-4" />
                  {t.principalAmount}
                </Label>
                <Input
                  id="principal"
                  type="number"
                  step="1000"
                  value={formData.principal_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, principal_amount: e.target.value });
                    setEditAmountError(null);
                  }}
                  placeholder="0"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  disabled={false}
                />
                {!!editingLoan && editingLoan.amount_paid > 0 && (
                  <span className="text-xs text-gray-500 mt-1">
                    {language === 'ta'
                      ? 'பணம் செலுத்தல் தொடங்கிய பிறகு கடன் தொகையை குறைக்க முடியாது. அதிகரிக்க மட்டும் முடியும்.'
                      : 'Cannot decrease loan amount after payments have started. You can only increase.'}
                  </span>
                )}
                {editAmountError && (
                  <span className="text-xs text-red-500 mt-1">{editAmountError}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 pb-2">
                <Label htmlFor="interest" className="flex items-center gap-2 pb-1">
                  <TrendingUp className="w-4 h-4" />
                  {t.interestRate}
                </Label>
                <Input
                  id="interest"
                  type="number"
                  step="15"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                  placeholder="15"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
                <div className="flex flex-col gap-1 pb-2">
                <Label htmlFor="duration" className="flex items-center gap-2 pb-1">
                  <Clock className="w-4 h-4" />
                  {t.duration}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                  placeholder="1"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
                </div>
              <div className="flex flex-col gap-1 pb-2">
                <Label htmlFor="startDate" className="flex items-center gap-2 pb-1">
                  <Calendar className="w-4 h-4" />
                  {t.startDate}
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : t.save}
                </Button>
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  {t.cancel}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-1 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                {/* Filter Tag Buttons for Loan Status */}
        <div className="flex gap-1 mt-2 sm:mt-0">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full px-3 py-1 text-xs ${statusFilter === 'all' ? 'bg-green-600 text-white' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full px-3 py-1 text-xs ${statusFilter === 'active' ? 'bg-green-500 text-white' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            {t.active}
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full px-3 py-1 text-xs ${statusFilter === 'completed' ? 'bg-blue-500 text-white' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            {t.completed}
          </Button>
          <Button
            variant={statusFilter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full px-3 py-1 text-xs ${statusFilter === 'overdue' ? 'bg-red-500 text-white' : ''}`}
            onClick={() => setStatusFilter('overdue')}
          >
            {t.overdue}
          </Button>
        </div>
        <Input
          type="text"
          placeholder="Search by borrower, amount, or status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full focus-visible:ring-0 focus-visible:border-green-600 dark:focus-visible:border-green-800"
        />

      </div>

      {filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {t.noLoans}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredLoans.map((loan) => {
            const progress = calculateProgress(loan.amount_paid, loan.total_amount);
            const daysRemaining = calculateDaysRemaining(loan.start_date, loan.duration_months);
            const dailyPayment = loan.total_amount / (loan.duration_months * 30);
            const totalPayment = loan.principal_amount + (loan.principal_amount * loan.interest_rate / 100);
            const loanEndDate = calculateLoanEndDate(loan.start_date, loan.duration_months);

            return (
              <Card
                key={loan.id}
                className="transition-all border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-xl
                  bg-gradient-to-br
                  from-green-100 via-white to-red-100
                  dark:from-green-950/30 dark:via-gray-900/95 dark:to-red-950/30
                  group"
              >
                <CardHeader className="pb-2 pt-2 border-gray-100 dark:border-gray-800
                  bg-gradient-to-r
                  from-green-100/80 to-transparent
                  dark:from-green-900/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900">
                        <User className="w-4 h-4 text-green-700 dark:text-green-300" />
                      </span>
                      <span className="truncate text-lg font-bold text-gray-800 dark:text-gray-100">
                        {
                          // Use formatDisplayName logic directly on loan.borrowerName (no title)
                          (() => {
                            const name = loan.borrowerName || "";
                            const parts = name.trim().split(" ");
                            if (parts.length === 3) {
                              const second =
                                parts[1].charAt(0).toUpperCase() + ".";
                              const third = parts[2];
                              return `${second} ${third}`;
                            }
                            return name || "Unknown";
                          })()
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(loan.status)}`}>
                        {getStatusIcon(loan.status)}
                        {getStatusText(loan.status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1 space-y-3">
                  <div className="grid grid-cols-3 gap-2 mt-2 mb-1 text-left">
                    {/* Row 1 */}
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-gray-500 flex items-center gap-1 truncate">
                        <DollarSign className="w-2.5 h-2.5" />
                        Amount
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                        ₹ {loan.principal_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-gray-500 flex items-center gap-1 truncate">
                        <TrendingUp className="w-2.5 h-2.5" />
                        Rate (%)
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                        {loan.interest_rate} %
                      </span>
                    </div>
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-gray-500 flex items-center gap-1 truncate">
                        <Clock10 className="w-2.5 h-2.5" />
                        {t.dailyPayment}
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                        ₹ {dailyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    {/* Row 2 */}
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-gray-500 flex items-center gap-1 truncate">
                        <Calendar className="w-2.5 h-2.5" />
                        Duration
                      </span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                        {loan.duration_months * 30} {`${t.daysRemaining.replace(/[^A-Za-z]/g, '') || 'days'}`}
                      </span>
                    </div>
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-gray-500 flex items-center gap-1 truncate">
                        <DollarSign className="w-2.5 h-2.5" />
                        Interest
                      </span>
                      <span className="text-xs font-semibold  text-gray-900 dark:text-gray-100 leading-tight truncate">
                        ₹ {(loan.total_amount - loan.principal_amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-gray-500 flex items-center gap-1 truncate">
                        <Clock className="w-2.5 h-2.5" />
                        R.Days
                      </span>
                      <span className="text-xs font-semibold text-red-500 dark:text-red-500 leading-tight truncate">
                        {calculateDaysRemaining(loan.start_date, loan.duration_months)}
                      </span>
                    </div>
                    {/* Row 3 */}
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-red-600 dark:text-red-500 flex items-center gap-1 truncate">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Arrears
                      </span>
                      <span className="text-xs font-bold text-red-700 dark:text-red-500 truncate">
                        ₹ {calculateArrears(loan).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-red-600 dark:text-red-500 flex items-center gap-1 truncate">
                        <Clock10 className="w-2.5 h-2.5" />
                        Missed Days
                      </span>
                      <span className="text-xs font-bold text-red-700 dark:text-red-500 truncate">
                        {calculateMissedDays(loan)} days
                      </span>
                    </div>
                    <div className="bg-gray-50/80 dark:bg-gray-800/80 rounded-lg px-2 py-1 flex flex-col items-start text-left min-w-0">
                      <span className="text-[12px] text-blue-600 dark:text-blue-500 flex items-center gap-1 truncate">
                        <Calendar className="w-2.5 h-2.5" />
                        Next Pay
                      </span>
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-00 truncate">
                        {(() => {
                          // Calculate next unpaid day based on amount_paid and today's date
                          const start = new Date(loan.start_date);
                          const totalDays = loan.duration_months * 30;
                          const dailyPayment = loan.total_amount / totalDays;
                          const paidDays = Math.floor(loan.amount_paid / dailyPayment);

                          // Find the next unpaid date: start date + paidDays
                          let nextDate = new Date(start);
                          nextDate.setDate(start.getDate() + paidDays);

                          // If all paid, set to end date
                          if (loan.amount_paid >= loan.total_amount) {
                            nextDate = new Date(start);
                            nextDate.setDate(start.getDate() + totalDays);
                          }

                          // If nextDate is before today, set to today (for overdue)
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          if (nextDate < today) {
                            nextDate = today;
                          }

                          return nextDate.toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: '2-digit' });
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center mt-2 text-left">
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[12px] text-green-500 truncate">{t.amountPaid}:</span>
                      <span className="text-xs font-bold text-green-600 truncate">₹ {loan.amount_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-[12px] text-right text-red-500 truncate">{t.remainingAmount}:</span>
                      <span className="text-right text-xs font-bold text-red-600 truncate">₹ {(loan.total_amount - loan.amount_paid).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="relative flex items-center">
                    <Progress value={progress} className="h-2 mt-0 mb-0 flex-1" />
                    <span className="ml-2 text-xs font-bold text-green-600 dark:text-green-500 z-10">
                      {progress}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 truncate">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {t.startDate}: {new Date(loan.start_date).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {t.nextPayment}: {new Date(loanEndDate).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1">
                    {loan.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => handleCollectPayment(loan)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-semibold rounded-lg shadow-sm transition-all duration-150 text-xs px-2 py-1 flex items-center gap-1"
                        style={{ minWidth: 0 }}
                      >
                        <DollarSign className="w-4 h-4" />
                        {t.collectPayment}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReversePayment(loan)}
                      className="flex-0 text-xs px-2 py-1 border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-yellow-50 dark:hover:bg-yellow-900 hover:border-yellow-400 dark:hover:border-yellow-400 transition-all duration-150"
                      disabled={isLoading}
                      style={{ minWidth: 0 }}
                    >
                      <Undo2 className="w-4 h-4 text-yellow-600 dark:text-yellow-300" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(loan)}
                      className="flex-0 text-xs px-2 py-1 border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-400 dark:hover:border-blue-400 transition-all duration-150"
                      disabled={isLoading}
                      style={{ minWidth: 0 }}
                    >
                      <Edit className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (loan.status === 'active' && loan.amount_paid > 0) {
                                  toast({
                                    title: language === 'ta'
                                      ? 'நிலுவை பணம் செலுத்துதலுடன் கடனை நீக்க முடியாது.'
                                      : 'Cannot delete loan with pending payments',
                                    variant: "destructive",
                                    duration: 3000
                                  });
                                } else {
                                  handleDeleteClick(loan);
                                }
                              }}
                              className={`flex-0 text-xs px-2 py-1 border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-900 hover:border-red-400 dark:hover:border-red-400 transition-all duration-150 ${
                                isLoading || (loan.status === 'active' && loan.amount_paid > 0)
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }`}
                              disabled={isLoading}
                              style={{ minWidth: 0 }}
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(loan.status === 'active' && loan.amount_paid > 0) && (
                          <TooltipContent className='bg-red-700 text-white items-center gap-1 hidden sm:flex'>
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs">
                            {language === 'ta'
                            ? 'நிலுவை பணம் செலுத்துதலுடன் கடனை நீக்க முடியாது.'
                            : 'Cannot delete loan with pending payments'}
                          </span>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedLoan && (
        <>
          <PaymentCollectionDialog
            isOpen={paymentDialogOpen}
            onClose={() => {
              setPaymentDialogOpen(false);
              setSelectedLoan(null);
            }}
            loan={selectedLoan}
            onPaymentCollect={onDataChange}
            language={language}
          />

          <ReversePaymentDialog
            isOpen={reversePaymentOpen}
            onClose={() => {
              setReversePaymentOpen(false);
              setSelectedLoan(null);
            }}
            loan={selectedLoan}
            onPaymentReversed={handlePaymentReversed}
            language={language}
          />
        </>
      )}

      <DeleteConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t.confirmDelete}
        message={t.deleteWarning}
        itemName={loanToDelete ? `${loanToDelete.borrowerName} - ₹${loanToDelete.total_amount.toLocaleString()}` : undefined}
        language={language}
      />
    </div>
  );
};

export default LoanManager;
