
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { SubcontractStepperProps } from '@/types/subcontract';
import { ProjectSubcontractorStep } from '@/components/subcontract/ProjectSubcontractorStep';
import { TradeItemForm } from '@/components/subcontract/TradeItemForm';
import { ResponsibilitiesStep } from '@/components/subcontract/ResponsibilitiesStep';
import { DocumentsReviewStep } from '@/components/subcontract/DocumentsReviewStep';
import { ContractTypeSelector } from '@/components/subcontract/ContractTypeSelector';
import { SubcontractFormModal } from '@/components/subcontract/SubcontractFormModal';
import { useData } from '@/contexts/DataContext';
import { useSubcontractForm } from '@/hooks/subcontract/useSubcontractForm';
import { useSubcontractValidation } from '@/hooks/subcontract/useSubcontractValidation';

export function SubcontractStepper({ onClose, onSave }: SubcontractStepperProps) {
  const { toast } = useToast();
  const { trades, tradeItems, responsibilities } = useData();
  const {
    currentStep,
    formData,
    setFormData,
    isSaving,
    setIsSaving,
    steps,
    handleNext,
    handlePrev,
    getTotalAmount
  } = useSubcontractForm();
  const { validateStep, validateFinalSave } = useSubcontractValidation();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File upload triggered');
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      console.log('Valid PDF file uploaded:', file.name);
      setFormData(prev => ({ ...prev, pdfFile: file }));
      toast({
        title: "File Uploaded",
        description: `${file.name} uploaded successfully`
      });
    } else {
      console.log('Invalid file type attempted:', file?.type);
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    console.log('Save button clicked');
    console.log('Current form data:', formData);
    console.log('Current step:', currentStep);

    if (!validateStep(currentStep, formData)) {
      console.log('Current step validation failed');
      return;
    }

    if (!validateFinalSave(formData)) {
      console.log('Final validation failed');
      return;
    }

    console.log('All validations passed, proceeding with save');

    // Compose data as expected by backend - contract ID will be auto-generated
    const subcontractData = {
      contractId: '', // Will be auto-generated based on type and project
      project: formData.project,
      subcontractor: formData.subcontractor,
      tradeItems: formData.tradeItems,
      responsibilities: formData.responsibilities,
      totalValue: getTotalAmount(),
      status: 'draft' as const,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateOfIssuing: formData.dateOfIssuing || new Date().toISOString().split('T')[0],
      description: `${formData.contractType === 'ADD' ? 'Addendum' : 'Subcontract'} for ${formData.project} with ${formData.subcontractor}`,
      contractType: formData.contractType || 'subcontract',
      addendumNumber: formData.contractType === 'ADD' ? (formData.addendumNumber || undefined) : undefined,
      parentSubcontractId: formData.contractType === 'ADD' ? (formData.parentSubcontractId || undefined) : undefined
    };

    console.log('Final subcontract data before save:', subcontractData);

    try {
      setIsSaving(true);
      console.log('Calling onSave with data:', subcontractData);
      await onSave(subcontractData);
      console.log('onSave completed successfully');
      toast({
        title: "Success",
        description: `${formData.contractType === 'ADD' ? 'Addendum' : 'Subcontract'} saved and will appear in the table.`
      });
      onClose(); // Close the modal/stepper after save
    } catch (err: any) {
      console.error('Error saving subcontract:', err);
      toast({
        title: "Save failed",
        description: err?.message || `Could not save ${formData.contractType === 'ADD' ? 'addendum' : 'subcontract'}.`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ProjectSubcontractorStep formData={formData} setFormData={setFormData} />;
      case 2:
        return (
          <TradeItemForm
            selectedItems={formData.tradeItems}
            onItemsChange={(items) => {
              console.log('Trade items changed:', items);
              setFormData(prev => ({ ...prev, tradeItems: items }));
            }}
            trades={trades || []}
            tradeItems={tradeItems || []}
          />
        );
      case 3:
        return (
          <ResponsibilitiesStep
            selectedResponsibilities={formData.responsibilities}
            onResponsibilitiesChange={(responsibilities) => {
              console.log('Responsibilities changed:', responsibilities);
              setFormData(prev => ({ ...prev, responsibilities }));
            }}
            responsibilities={responsibilities || []}
          />
        );
      case 4:
        return (
          <DocumentsReviewStep
            formData={formData}
            setFormData={setFormData}
            totalAmount={getTotalAmount()}
            onFileUpload={handleFileUpload}
            renderExtraFields={
              <>
                <div className="mt-4">
                  <label className="block font-medium mb-1">Date of Issuing</label>
                  <input
                    type="date"
                    className="border rounded px-3 py-2 w-full"
                    value={formData.dateOfIssuing || ''}
                    onChange={e => {
                      console.log('Date of issuing changed:', e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        dateOfIssuing: e.target.value
                      }));
                    }}
                    required
                  />
                </div>
                <div className="mt-4">
                  <ContractTypeSelector formData={formData} setFormData={setFormData} />
                </div>
              </>
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <SubcontractFormModal
      formData={formData}
      currentStep={currentStep}
      steps={steps}
      isSaving={isSaving}
      onClose={onClose}
      onPrev={handlePrev}
      onNext={() => {
        console.log('Next button clicked from step:', currentStep);
        handleNext(() => validateStep(currentStep, formData));
      }}
      onSave={handleSave}
    >
      {renderStepContent()}
    </SubcontractFormModal>
  );
}
