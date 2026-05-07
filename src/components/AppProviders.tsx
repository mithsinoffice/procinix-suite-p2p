import { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { FinanceRBACProvider } from '../contexts/FinanceRBACContext';
import { APDataProvider } from '../contexts/APDataContext';
import { BudgetDataProvider } from '../contexts/BudgetDataContext';
import { MasterDataProvider } from '../contexts/MasterDataContext';
import { ProcurementDataProvider } from '../contexts/ProcurementDataContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <FinanceRBACProvider>
        <MasterDataProvider>
          <APDataProvider>
            <ProcurementDataProvider>
              <BudgetDataProvider>{children}</BudgetDataProvider>
            </ProcurementDataProvider>
          </APDataProvider>
        </MasterDataProvider>
      </FinanceRBACProvider>
    </AuthProvider>
  );
}
