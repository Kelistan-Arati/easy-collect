import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader as UIDialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Phone, MapPin, User, CircleAlert, CreditCard, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { deleteBorrower, getLoans, createBorrower, updateBorrower } from '@/lib/database';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import React from 'react';

interface Borrower {
  id: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  name: string;
  nic_number?: string;
  phone: string;
  address: string;
  total_loans?: number;
  active_loans?: number;
  total_amount?: number;
  pending_payment?: number;
  remaining_amount?: number;
  created_at?: string;
}

interface BorrowerManagerProps {
  language: string;
  borrowers: Borrower[];
  onDataChange: () => void;
}

  // Utility function to format display name like BorrowerManager
  const formatDisplayName = (borrower: Borrower) => {
    if (borrower.name) {
      const parts = borrower.name.trim().split(" ");
      if (parts.length === 3) {
        const first = parts[0];
        const second = parts[1].charAt(0).toUpperCase() + ".";
        const third = parts[2];
        return ` ${second} ${third}`;
      }
      return borrower.name;
    }
    return "Unknown Borrower";
  };

// BorrowerCard component (from BorrowerCard.tsx)
const BorrowerCard = ({
  borrower,
  onEdit,
  onDelete,
  isLoading,
  language,
  onViewPaymentHistory,
  onView,
}: {
  borrower: Borrower;
  onEdit: (borrower: Borrower) => void;
  onDelete: (borrower: Borrower) => void;
  isLoading: boolean;
  language: string;
  onViewPaymentHistory?: (borrower: Borrower) => void;
  onView?: (borrower: Borrower) => void;
}) => {
  const translations = {
    en: {
      edit: "Edit",
      delete: "Delete",
      totalLoans: "Loans Amount",
      pendingPayment: "Pending Pay",
      deleteWarning: "Cannot undo. Settle loans to delete.",
      paymentHistory: "Payment History",
    },
    ta: {
      edit: "திருத்து",
      delete: "நீக்கு",
      totalLoans: "மொத்த கடன்கள்",
      pendingPayment: "நிலுவையில் உள்ள பணம்",
      deleteWarning: "செயல்தவிர்க்க முடியாது. நீக்க வேண்டிய கடன்களைத் தீர்க்கவும்.",
      paymentHistory: "பணம் செலுத்தல் வரலாறு",
    },
  };
  const t = translations[language as keyof typeof translations];
  const hasPendingLoans = (borrower: Borrower) => (borrower.active_loans ?? 0) > 0;
  return (
    <Card className="transition-all border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-xl bg-gradient-to-br from-blue-100 via-gray-50 to-red-100 dark:from-blue-950 dark:via-gray-800 dark:to-red-200/20 group">
      <CardHeader className="pb-2 pt-2 border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50/60 to-transparent dark:from-blue-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 group-hover:scale-105 transition-transform">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </span>
            <span
              className="truncate text-lg font-bold text-gray-800 dark:text-gray-100 cursor-pointer"
              title={borrower.name}
            >
              {formatDisplayName(borrower).length > 15
                ? `${formatDisplayName(borrower).slice(0, 17)}..`
                : formatDisplayName(borrower)}
            </span>
          </div>
            <div className="flex gap-1 ml-1">
              {/* View Button - now first */}
              <span className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 flex items-center h-8 w-8 justify-center transition-colors duration-150 hover:border-green-400 dark:hover:border-green-400">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView && onView(borrower)}
                className="p-2 hover:bg-green-100 dark:hover:bg-green-900 rounded h-8 w-8"
                disabled={isLoading}
                aria-label="View"
              >
                <Eye className="w-4 h-4 text-green-600 dark:text-green-300" />
              </Button>
              </span>
              {/* Edit Button */}
              <span className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 flex items-center h-8 w-8 justify-center transition-colors duration-150 hover:border-blue-400 dark:hover:border-blue-400">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(borrower)}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded h-8 w-8"
                disabled={isLoading}
                aria-label={t.edit}
              >
                <Edit className="w-4 h-4 text-blue-600 dark:text-blue-300" />
              </Button>
              </span>
              {/* Delete Button */}
              <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                <span className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 flex items-center h-8 w-8 justify-center transition-colors duration-150 hover:border-red-400 dark:hover:border-red-400">
                  <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (hasPendingLoans(borrower)) {
                    toast({
                      title: t.deleteWarning,
                      variant: "destructive",
                    });
                    } else {
                    onDelete(borrower);
                    }
                  }}
                  className={`p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded h-8 w-8 ${hasPendingLoans(borrower) ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={isLoading}
                  style={{ minWidth: 0 }}
                  aria-label={t.delete}
                  >
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </Button>
                </span>
                </TooltipTrigger>
                {hasPendingLoans(borrower) && (
                <TooltipContent className="bg-red-700 text-white flex items-center gap-1">
                  <CircleAlert className="w-4 h-4" />
                  <span className="text-xs">{t.deleteWarning}</span>
                </TooltipContent>
                )}
              </Tooltip>
              </TooltipProvider>
            </div>
        </div>
      </CardHeader>
      {/* Card content with improved visual separation */}
      <CardContent className="space-y-3 pt-3">
        <div className="flex flex-col gap-2 text-sm text-gray-700 dark:text-gray-300 bg-white/80 dark:bg-gray-900/60 rounded-lg p-3 shadow-inner">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-500" />
            <span className="truncate">{borrower.nic_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-500" />
            <span className="truncate">{borrower.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="truncate">{borrower.address}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-0">
          <div className="flex flex-col items-center flex-1 bg-blue-50 dark:bg-blue-950/30 rounded-lg py-2">
            <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {borrower.total_loans ?? 0}
            </div>
            <div className="text-xs text-gray-500">Total Loans</div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-purple-50 dark:bg-purple-950/30 rounded-lg py-2">
            <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
              {(borrower.total_amount || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">{t.totalLoans}</div>
          </div>
          <div className="flex flex-col items-center flex-1 bg-red-50 dark:bg-red-950/30 rounded-lg py-2">
            <div className="text-sm font-bold text-red-700 dark:text-red-300">
              {(borrower.pending_payment ?? borrower.remaining_amount ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">{t.pendingPayment}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// BorrowerFormDialog component (from BorrowerFormDialog.tsx)
const BorrowerFormDialog = ({
  isOpen,
  onClose,
  editingBorrower,
  onDataChange,
  language
}: {
  isOpen: boolean;
  onClose: () => void;
  editingBorrower: Borrower | null;
  onDataChange: () => void;
  language: string;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Helper to extract title, first_name, last_name from name
  const extractNameParts = (borrower: Borrower | null) => {
    if (borrower?.name) {
      const parts = borrower.name.trim().split(" ");
      return {
        title: parts[0] || '',
        first_name: parts[1]?.replace('.', '') || '',
        last_name: parts[2] || ''
      };
    }
    return {
      title: borrower?.title || '',
      first_name: borrower?.first_name || '',
      last_name: borrower?.last_name || ''
    };
  };

  const initialNameParts = extractNameParts(editingBorrower);

  const [formData, setFormData] = useState(() => ({
    title: editingBorrower?.title || initialNameParts.title,
    first_name: editingBorrower?.first_name || initialNameParts.first_name,
    last_name: editingBorrower?.last_name || initialNameParts.last_name,
    nic_number: editingBorrower?.nic_number || '',
    phone: editingBorrower?.phone?.startsWith('+94') ? editingBorrower.phone.replace('+94', '0') : editingBorrower?.phone || '',
    address: editingBorrower?.address || ''
  }));

  // When editingBorrower changes, update formData accordingly
  React.useEffect(() => {
    const nameParts = extractNameParts(editingBorrower);
    setFormData({
      title: editingBorrower?.title || nameParts.title,
      first_name: editingBorrower?.first_name || nameParts.first_name,
      last_name: editingBorrower?.last_name || nameParts.last_name,
      nic_number: editingBorrower?.nic_number || '',
      phone: editingBorrower?.phone?.startsWith('+94') ? editingBorrower.phone.replace('+94', '0') : editingBorrower?.phone || '',
      address: editingBorrower?.address || ''
    });
  }, [editingBorrower]);

  const titleOptions = [
    { value: 'Mr.', label: 'Mr.' },
    { value: 'Mrs.', label: 'Mrs.' },
    { value: 'Miss.', label: 'Miss.' },
    { value: 'Master.', label: 'Master.' }
  ];

  const translations = {
    en: {
      addBorrower: 'Add New Borrower',
      editBorrower: 'Edit Borrower',
      titleField: 'Title',
      firstName: 'First Name',
      lastName: 'Last Name',
      nicNumber: 'NIC Number',
      phone: 'Phone Number',
      address: 'Address',
      save: 'Save',
      cancel: 'Cancel',
      borrowerAdded: 'Borrower added successfully',
      borrowerUpdated: 'Borrower updated successfully',
      fillAllFields: 'Please fill all required fields'
    },
    ta: {
      addBorrower: 'புதிய கடன் வாங்குபவரைச் சேர்க்கவும்',
      editBorrower: 'கடன் வாங்குபவரைத் திருத்தவும்',
      titleField: 'பட்டம்',
      firstName: 'முதல் பெயர்',
      lastName: 'கடைசி பெயர்',
      nicNumber: 'அடையாள அட்டை எண்',
      phone: 'தொலைபேசி எண்',
      address: 'முகவரி',
      save: 'சேமிக்கவும்',
      cancel: 'ரத்து செய்யவும்',
      borrowerAdded: 'கடன் வாங்குபவர் வெற்றிகரமாக சேர்க்கப்பட்டார்',
      borrowerUpdated: 'கடன் வாங்குபவர் வெற்றிகரமாக புதுப்பிக்கப்பட்டார்',
      fillAllFields: 'தயவுசெய்து அனைத்து தேவையான புலங்களையும் நிரப்பவும்'
    }
  };

  const t = translations[language as keyof typeof translations];

  const handleSubmit = async () => {
    if (!editingBorrower && (!formData.title || !formData.first_name || !formData.last_name || !formData.nic_number || !formData.phone || !formData.address)) {
      toast({ title: t.fillAllFields, variant: "destructive" });
      return;
    }
    const phoneWithoutCountryCode = formData.phone.replace(/^0+/, '');
    if (phoneWithoutCountryCode.length !== 9 || !/^\d{9}$/.test(phoneWithoutCountryCode)) {
      toast({
        title: language === 'ta'
          ? 'தொலைபேசி எண் 9 இலக்கமாக இருக்க வேண்டும் மற்றும் முதல் இலக்கம் 0 இல்லாமல் இருக்க வேண்டும்'
          : 'Phone number must be 9 digits long and should not start with 0',
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const fullName = `${formData.title} ${formData.first_name.charAt(0).toUpperCase()}. ${formData.last_name}`;
      const phoneWithCountryCode = `+94${phoneWithoutCountryCode}`;
      const borrowerData = {
        title: formData.title,
        first_name: formData.first_name,
        last_name: formData.last_name,
        name: fullName,
        nic_number: formData.nic_number,
        phone: phoneWithCountryCode,
        address: formData.address
      };
      if (editingBorrower) {
        await updateBorrower(editingBorrower.id, borrowerData);
        toast({ title: t.borrowerUpdated });
      } else {
        await createBorrower(borrowerData);
        toast({ title: t.borrowerAdded });
      }
      onDataChange();
      resetForm();
    } catch (error) {
      console.error('Error saving borrower:', error);
      toast({
        title: "Error",
        description: "Failed to save borrower. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    const nameParts = extractNameParts(editingBorrower);
    setFormData({
      title: nameParts.title,
      first_name: nameParts.first_name,
      last_name: nameParts.last_name,
      nic_number: editingBorrower?.nic_number || '',
      phone: editingBorrower?.phone?.startsWith('+94') ? editingBorrower.phone.replace('+94', '0') : editingBorrower?.phone || '',
      address: editingBorrower?.address || ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-900 gap-0">
        <UIDialogHeader className="px-6 pt-2 pb-2 border-b dark:border-gray-800">
          <DialogTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {editingBorrower ? t.editBorrower : t.addBorrower}
          </DialogTitle>
        </UIDialogHeader>
        <div className="px-6 py-6 space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="pb-1 text-gray-700 dark:text-gray-300">{t.titleField}</Label>
            <Select value={formData.title} onValueChange={(value) => setFormData({ ...formData, title: value })}>
              <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <SelectValue placeholder={formData.title || "Select title"} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-50">
                {titleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="first_name" className="pb-1 text-gray-700 dark:text-gray-300">{t.firstName}</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder={formData.first_name || t.firstName}
                className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Label htmlFor="last_name" className="pb-1 text-gray-700 dark:text-gray-300">{t.lastName}</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder={formData.last_name || t.lastName}
                className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nic_number" className="pb-1 text-gray-700 dark:text-gray-300">{t.nicNumber}</Label>
            <Input
              id="nic_number"
              value={formData.nic_number}
              onChange={(e) => setFormData({ ...formData, nic_number: e.target.value })}
              placeholder={formData.nic_number || t.nicNumber}
              className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="pb-1 text-gray-700 dark:text-gray-300">{t.phone}</Label>
            <div className="flex">
              <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-200 dark:border-gray-700 rounded-l-md text-gray-600 dark:text-gray-300 text-sm">
                +94
              </div>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={formData.phone || "771234567"}
                className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-l-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address" className="pb-1 text-gray-700 dark:text-gray-300">{t.address}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={formData.address || t.address}
              className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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
            <Button
              variant="outline"
              onClick={resetForm}
              className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              {t.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// BorrowerViewDialog component
const BorrowerViewDialog = ({
  isOpen,
  onClose,
  borrower,
  language,
}: {
  isOpen: boolean;
  onClose: () => void;
  borrower: Borrower | null;
  language: string;
}) => {
  if (!borrower) return null;
  const translations = {
    en: {
      title: "Borrower Details",
      fullName: "Full Name",
      nic: "NIC Number",
      phone: "Phone Number",
      address: "Address",
      totalLoans: "Total Loans",
      activeLoans: "Active Loans",
      totalAmount: "Total Amount",
      pendingPayment: "Pending Payment",
      close: "Close",
      personalDetails: "Personal Details",
      loanDetails: "Loan Details",
    },
    ta: {
      title: "கடன் வாங்குபவர் விவரங்கள்",
      fullName: "முழு பெயர்",
      nic: "அடையாள அட்டை எண்",
      phone: "தொலைபேசி எண்",
      address: "முகவரி",
      totalLoans: "மொத்த கடன்கள்",
      activeLoans: "செயலில் உள்ள கடன்கள்",
      totalAmount: "மொத்த தொகை",
      pendingPayment: "நிலுவை தொகை",
      close: "மூடு",
      personalDetails: "தனிப்பட்ட விவரங்கள்",
      loanDetails: "கடன் விவரங்கள்",
    }
  };
  const t = translations[language as keyof typeof translations];
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <UIDialogHeader className="px-6 pt-4 pb-2 border-b dark:border-gray-800">
          <DialogTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {t.title}
          </DialogTitle>
        </UIDialogHeader>
        <div className="px-6 py-6 space-y-6">
          <div>
            <div className="text-lg font-bold mb-2 text-blue-700 dark:text-blue-300">{t.fullName}</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{borrower.title} {borrower.first_name} {borrower.last_name}</div>
          </div>
          <div>
            <div className="font-semibold text-purple-700 dark:text-purple-300 mb-1">{t.loanDetails}</div>
            <div className="grid grid-cols-2 gap-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
              <div>
                <div className="text-xs text-gray-500">{t.totalLoans}</div>
                <div className="font-bold text-purple-700 dark:text-purple-200">{borrower.total_loans ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.activeLoans}</div>
                <div className="font-bold text-purple-700 dark:text-purple-200">{borrower.active_loans ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.totalAmount}</div>
                <div className="font-bold text-green-700 dark:text-green-200">₹{(borrower.total_amount ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t.pendingPayment}</div>
                <div className="font-bold text-red-700 dark:text-red-200">₹{(borrower.pending_payment ?? borrower.remaining_amount ?? 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">{t.personalDetails}</div>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-200">{t.nic}: {borrower.nic_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-200">{t.phone}: {borrower.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-200">{t.address}: {borrower.address}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">{t.close}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BorrowerManager = ({ language, borrowers, onDataChange }: BorrowerManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [borrowerToDelete, setBorrowerToDelete] = useState<Borrower | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [selectedBorrowerLoan, setSelectedBorrowerLoan] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewBorrower, setViewBorrower] = useState<Borrower | null>(null);

  const translations = {
    en: {
      title: 'Borrower Management',
      addBorrower: 'Add New Borrower',
      borrowerDeleted: 'Borrower deleted successfully',
      noBorrowers: 'No borrowers registered yet',
      confirmDelete: 'Are you sure you want to delete this borrower?',
      deleteWarning: 'Cannot undo. Settle loans to delete.',
      searchPlaceholder: 'Search by name, phone, NIC, or address'
    },
    ta: {
      title: 'கடன் வாங்குபவர் மேலாண்மை',
      addBorrower: 'புதிய கடன் வாங்குபவரைச் சேர்க்கவும்',
      borrowerDeleted: 'கடன் வாங்குபவர் வெற்றிகரமாக நீக்கப்பட்டார்',
      noBorrowers: 'இதுவரை கடன் வாங்குபவர்கள் பதிவு செய்யப்படவில்லை',
      confirmDelete: 'இந்த கடன் வாங்குபவரை நீக்க விரும்புகிறீர்களா?',
      deleteWarning: 'செயல்தவிர்க்க முடியாது. நீக்க வேண்டிய கடன்களைத் தீர்க்கவும்.',
      searchPlaceholder: 'பெயர், தொலைபேசி, அடையாள அட்டை அல்லது முகவரி மூலம் தேடுங்கள்'
    }
  };

  const t = translations[language as keyof typeof translations];

  const handleEdit = (borrower: Borrower) => {
    setEditingBorrower(borrower);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (borrower: Borrower) => {
    setBorrowerToDelete(borrower);
    setDeleteConfirmOpen(true);
  };

  const handleViewPaymentHistory = async (borrower: Borrower) => {
    try {
      const loans = await getLoans();
      const borrowerLoan = loans.find(loan => loan.borrower_id === borrower.id && loan.status === 'active');
      if (borrowerLoan) {
        setSelectedBorrowerLoan({
          ...borrowerLoan,
          borrowerName: borrower.name
        });
        setIsPaymentHistoryOpen(true);
      } else {
        toast({
          title: "No active loans",
          description: "This borrower has no active loans to show payment history for.",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error fetching loan data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment history. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!borrowerToDelete) return;
    setIsLoading(true);
    try {
      await deleteBorrower(borrowerToDelete.id);
      toast({ title: t.borrowerDeleted });
      onDataChange();
    } catch (error) {
      console.error('Error deleting borrower:', error);
      toast({
        title: "Error",
        description: "Failed to delete borrower. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
      setDeleteConfirmOpen(false);
      setBorrowerToDelete(null);
    }
  };

  const filteredBorrowers = borrowers.filter((borrower) => {
    const name = borrower.name || '';
    const phone = borrower.phone || '';
    const address = borrower.address || '';
    const nicNumber = borrower.nic_number || '';
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      phone.toLowerCase().includes(search.toLowerCase()) ||
      address.toLowerCase().includes(search.toLowerCase()) ||
      nicNumber.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Calculate total loans count for filtered borrowers
  const totalLoansCount = filteredBorrowers.reduce((sum, borrower) => sum + (borrower.total_loans ?? 0), 0);

  return (
    <div className="p-6 space-y-6 pt-5">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-left text-gray-800 dark:text-gray-200 flex-1">
          {t.title}
        </h2>
        {/* Total Loans Count Card + Add Button */}
        <div className="flex items-center gap-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingBorrower(null);
                  setIsDialogOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-red-800 hover:from-blue-700 hover:to-red-900 text-white dark:text-white px-3 py-2 text-sm md:text-base flex items-center gap-2"
              >
                <Plus className="w-4 h-4 mr-0" />
                <span className="hidden sm:inline">{t.addBorrower}</span>
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>
      <div className="mb-1">
        <Input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full focus-visible:ring-0 focus-visible:border-blue-600 dark:focus-visible:border-blue-600"
        />
      </div>
      {filteredBorrowers.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {t.noBorrowers}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBorrowers.map((borrower) => (
            <BorrowerCard
              key={borrower.id}
              borrower={borrower}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onViewPaymentHistory={handleViewPaymentHistory}
              isLoading={isLoading}
              language={language}
              onView={(b) => {
                setViewBorrower(b);
                setIsViewDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}
      <BorrowerFormDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingBorrower(null);
        }}
        editingBorrower={editingBorrower}
        onDataChange={onDataChange}
        language={language}
      />
      <DeleteConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t.confirmDelete}
        message={t.deleteWarning}
        itemName={borrowerToDelete?.name}
        language={language}
      />
      <BorrowerViewDialog
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        borrower={viewBorrower}
        language={language}
      />
    </div>
  );
};

export default BorrowerManager;
