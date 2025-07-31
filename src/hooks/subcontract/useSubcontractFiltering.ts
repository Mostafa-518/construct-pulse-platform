
import { useMemo } from 'react';
import { useSubcontractHelpers } from './useSubcontractHelpers';
import { useData } from '@/contexts/DataContext';

export function useSubcontractFiltering(subcontracts: any[], reportFilters?: any) {
  const { getProjectName, getProjectCode, getSubcontractorName } = useSubcontractHelpers();
  const { projects } = useData();

  const filteredSubcontracts = useMemo(() => {
    console.log('useSubcontractFiltering - Starting filter process');
    console.log('Report filters received:', reportFilters);
    console.log('Total subcontracts:', subcontracts.length);
    
    if (!reportFilters) {
      console.log('No report filters, returning all subcontracts');
      return subcontracts;
    }
    
    const filtered = subcontracts.map(subcontract => {
      console.log(`\n--- Processing Subcontract ${subcontract.contractId || subcontract.contract_number} ---`);
      console.log('Full subcontract object:', subcontract);
      
      // Month filter
      if (reportFilters.month && reportFilters.month !== 'all' && reportFilters.month !== 'All') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === reportFilters.month.toLowerCase());
        
        if (monthIndex !== -1 && (subcontract.dateOfIssuing || subcontract.date_of_issuing)) {
          const dateField = subcontract.dateOfIssuing || subcontract.date_of_issuing;
          const subcontractMonth = new Date(dateField).getMonth();
          if (subcontractMonth !== monthIndex) {
            console.log(`❌ Month filter failed: expected ${reportFilters.month} (${monthIndex}), got month ${subcontractMonth}`);
            return null;
          }
          console.log(`✅ Month filter passed: ${reportFilters.month}`);
        }
      }

      // Year filter
      if (reportFilters.year && reportFilters.year !== 'all' && reportFilters.year !== 'All') {
        if (subcontract.dateOfIssuing || subcontract.date_of_issuing) {
          const dateField = subcontract.dateOfIssuing || subcontract.date_of_issuing;
          const subcontractYear = new Date(dateField).getFullYear().toString();
          if (subcontractYear !== reportFilters.year) {
            console.log(`❌ Year filter failed: expected ${reportFilters.year}, got ${subcontractYear}`);
            return null;
          }
          console.log(`✅ Year filter passed: ${reportFilters.year}`);
        }
      }

      // Location filter - Enhanced logic
      if (reportFilters.location && reportFilters.location !== 'all' && reportFilters.location !== 'All') {
        console.log(`🔍 LOCATION FILTER`);
        console.log(`Selected location: ${reportFilters.location}`);
        
        // Get the project for this subcontract
        const projectId = subcontract.project || subcontract.project_id;
        console.log(`Subcontract project ID: ${projectId}`);
        
        // Find the project and check its location
        const project = projects.find(p => p.id === projectId);
        console.log(`Found project:`, project);
        
        if (!project) {
          console.log(`❌ Location filter failed: No project found for ID ${projectId}`);
          return null;
        }
        
        const projectLocation = project.location;
        console.log(`Project location: ${projectLocation}`);
        
        if (projectLocation !== reportFilters.location) {
          console.log(`❌ Location filter failed: expected "${reportFilters.location}", got "${projectLocation}"`);
          return null;
        }
        
        console.log(`✅ Location filter passed: ${reportFilters.location}`);
      }

      // Project name filter
      if (reportFilters.projectName && reportFilters.projectName !== 'all' && reportFilters.projectName !== 'All') {
        const projectId = subcontract.project || subcontract.project_id;
        const projectName = getProjectName(projectId);
        if (projectName !== reportFilters.projectName) {
          console.log(`❌ Project name filter failed: expected "${reportFilters.projectName}", got "${projectName}"`);
          return null;
        }
        console.log(`✅ Project name filter passed: ${reportFilters.projectName}`);
      }

      // Project code filter
      if (reportFilters.projectCode && reportFilters.projectCode !== 'all' && reportFilters.projectCode !== 'All') {
        const projectId = subcontract.project || subcontract.project_id;
        const projectCode = getProjectCode(projectId);
        if (projectCode !== reportFilters.projectCode) {
          console.log(`❌ Project code filter failed: expected "${reportFilters.projectCode}", got "${projectCode}"`);
          return null;
        }
        console.log(`✅ Project code filter passed: ${reportFilters.projectCode}`);
      }

      // Facilities filter - STRICT: ALL selected facilities must be present
      if (reportFilters.facilities && reportFilters.facilities.length > 0) {
        console.log(`🔍 FACILITIES FILTER - STRICT MODE`);
        console.log(`Selected facilities (${reportFilters.facilities.length}):`, reportFilters.facilities);
        
        // Handle different data structures for responsibilities
        const responsibilities = subcontract.responsibilities || 
                               subcontract.subcontract_responsibilities || 
                               [];
        
        console.log(`Subcontract responsibilities RAW:`, responsibilities);
        
        let responsibilityNames: string[] = [];
        
        if (!responsibilities || !Array.isArray(responsibilities)) {
          console.log(`❌ FACILITIES FILTER FAILED: No valid responsibilities array`);
          return null;
        }
        
        if (responsibilities.length === 0) {
          console.log(`❌ FACILITIES FILTER FAILED: Empty responsibilities array`);
          return null;
        }
        
        // Extract responsibility names from different data structures
        responsibilityNames = responsibilities.map(resp => {
          if (typeof resp === 'string') {
            return resp;
          } else if (typeof resp === 'object' && resp !== null) {
            return resp.name || 
                   (resp.responsibilities && resp.responsibilities.name) ||
                   resp.responsibility || 
                   '';
          }
          return '';
        }).filter(Boolean);
        
        console.log(`Extracted responsibility names (${responsibilityNames.length}):`, responsibilityNames);
        
        // Check each selected facility individually
        for (const selectedFacility of reportFilters.facilities) {
          const isPresent = responsibilityNames.includes(selectedFacility);
          console.log(`  - Checking facility "${selectedFacility}": ${isPresent ? '✅ PRESENT' : '❌ MISSING'}`);
          
          if (!isPresent) {
            console.log(`❌ FACILITIES FILTER FAILED: Missing facility "${selectedFacility}"`);
            return null;
          }
        }
        
        console.log(`✅ FACILITIES FILTER PASSED: All ${reportFilters.facilities.length} facilities are present`);
      }

      // Trade filter - NEW: Filter at trade item level
      if (reportFilters.trades && reportFilters.trades !== 'all' && reportFilters.trades !== 'All') {
        console.log(`🔍 TRADE FILTER - ITEM LEVEL`);
        console.log(`Selected trade: ${reportFilters.trades}`);
        
        const tradeItems = subcontract.tradeItems || subcontract.subcontract_trade_items || [];
        
        if (!tradeItems || tradeItems.length === 0) {
          console.log(`❌ Trade filter failed: no trade items`);
          return null;
        }

        // Filter trade items to only include matching trades
        const filteredTradeItems = tradeItems.filter(item => {
          const tradeName = item.trade || 
                           (item.trade_items && item.trade_items.trades && item.trade_items.trades.name) ||
                           (item.tradeItem && item.tradeItem.trade && item.tradeItem.trade.name);
          
          const matches = tradeName && tradeName.toLowerCase().includes(reportFilters.trades.toLowerCase());
          console.log(`  - Trade item "${tradeName}": ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
          return matches;
        });

        if (filteredTradeItems.length === 0) {
          console.log(`❌ Trade filter failed: no matching trade items`);
          return null;
        }

        console.log(`✅ Trade filter passed: ${filteredTradeItems.length} matching trade items`);
        
        // Return subcontract with only matching trade items
        return {
          ...subcontract,
          tradeItems: filteredTradeItems,
          subcontract_trade_items: filteredTradeItems
        };
      }

      console.log(`✅ Subcontract ${subcontract.contractId || subcontract.contract_number} passed all filters`);
      return subcontract;
    }).filter(Boolean);

    console.log('\n=== FILTER RESULTS ===');
    console.log('Filtered subcontracts count:', filtered.length);
    console.log('Filtered subcontract IDs:', filtered.map(s => s.contractId || s.contract_number || s.id));
    console.log('=== END FILTER PROCESS ===\n');
    
    return filtered;
  }, [subcontracts, reportFilters, getProjectName, getProjectCode, projects]);

  return filteredSubcontracts;
}
