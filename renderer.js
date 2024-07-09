document.addEventListener('DOMContentLoaded', async () => {
  const materialsList = document.getElementById('list');
  const tableHead = document.querySelector('thead tr');
  const refreshButton = document.getElementById('refresh-button');
  const refreshTimestamp = document.getElementById('refresh-timestamp');
  let qtyCrosscheckEnabled = false;

  async function fetchData() {
    try {
      const { columnNames, data, timestamp, settings } = await window.electron.fetchData();
      qtyCrosscheckEnabled = settings.qtyCrosscheck;
      setTableHeaders(columnNames);
      updateMaterialList(data, columnNames);
      refreshTimestamp.textContent = `Last refreshed: ${new Date(timestamp).toLocaleString()}`;
    } catch (error) {
      console.error('Error fetching data:', error.message);
      alert(`Error fetching data: ${error.message}`);
    }
  }

  function setTableHeaders(columnNames) {
    tableHead.innerHTML = '';
    columnNames.forEach(name => {
      const headerCell = document.createElement('th');
      headerCell.textContent = name;
      tableHead.appendChild(headerCell);
    });
  }

  function updateMaterialList(data, columnNames) {
    materialsList.innerHTML = '';
    data.forEach((material, rowIndex) => {
      // Only show rows that have an order number in column A
      if (!material[0]) {
        return;
      }

      const materialRow = document.createElement('tr');
      material.forEach((value, colIndex) => {
        const cell = document.createElement('td');

        if (columnNames[colIndex] === 'Fab Complete') {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = value === 'TRUE';
          checkbox.addEventListener('change', () => updateCheckboxState(rowIndex, checkbox.checked, columnNames));
          cell.appendChild(checkbox);
        } else if (columnNames[colIndex] === 'QTY Rec') {
          const qtyRecInput = document.createElement('input');
          qtyRecInput.type = 'number';
          qtyRecInput.value = value;
          qtyRecInput.className = 'qty-rec-input';  // Add this line to add a class
          qtyRecInput.addEventListener('input', () => validateQtyRec(qtyRecInput));
          qtyRecInput.addEventListener('change', () => updateQtyRecState(rowIndex, qtyRecInput.value, columnNames));
          cell.appendChild(qtyRecInput);
        } else {
          cell.textContent = value;
        }

        materialRow.appendChild(cell);
      });

      materialsList.appendChild(materialRow);
    });
  }

  function validateQtyRec(input) {
    if (input.value < 0) {
      alert('QTY Rec cannot be a negative number.');
      input.value = 0;
    }
  }

  async function updateCheckboxState(rowIndex, isChecked, columnNames) {
    const row = materialsList.children[rowIndex];
    const qtyRecCell = row.querySelector(`td:nth-child(${columnNames.indexOf('QTY Rec') + 1}) input`);
    const qtyReqCell = row.querySelector(`td:nth-child(${columnNames.indexOf('QTY Req') + 1})`);

    if (!qtyRecCell || !qtyReqCell) {
      console.error(`Required elements not found for crosscheck: rowIndex=${rowIndex}, qtyRecCell=${qtyRecCell}, qtyReqCell=${qtyReqCell}`);
      return;
    }

    const qtyRec = parseInt(qtyRecCell.value, 10) || 0;
    const qtyReq = parseInt(qtyReqCell.textContent, 10);

    console.log(`Row Index: ${rowIndex}, QTY Rec: ${qtyRec}, QTY Req: ${qtyReq}, isChecked: ${isChecked}, qtyCrosscheckEnabled: ${qtyCrosscheckEnabled}`);

    if (qtyCrosscheckEnabled && isChecked && qtyRec < qtyReq) {
      alert('Cannot mark as complete. QTY Rec must be equal to or greater than QTY Req.');
      // Revert the checkbox state
      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.checked = false;
      return;
    }

    try {
      await window.electron.updateSpreadsheet(rowIndex, 'Fab Complete', isChecked ? 'TRUE' : 'FALSE');
    } catch (error) {
      console.error('Error updating spreadsheet:', error.message);
      alert(`Error updating spreadsheet: ${error.message}`);
    }
  }

  async function updateQtyRecState(rowIndex, qtyRec, columnNames) {
    if (qtyRec < 0) {
      alert('QTY Rec cannot be a negative number.');
      qtyRec = 0;
    }
    try {
      await window.electron.updateSpreadsheet(rowIndex, 'QTY Rec', qtyRec);
      if (qtyCrosscheckEnabled) {
        const row = materialsList.children[rowIndex];
        const qtyReqCell = row.querySelector(`td:nth-child(${columnNames.indexOf('QTY Req') + 1})`);
        const fabCompleteCheckbox = row.querySelector(`td:nth-child(${columnNames.indexOf('Fab Complete') + 1}) input`);

        const qtyReq = parseInt(qtyReqCell.textContent, 10);
        qtyRec = parseInt(qtyRec, 10) || 0;

        if (qtyRec < qtyReq && fabCompleteCheckbox.checked) {
          alert('QTY Rec is less than QTY Req. Unchecking Fab Complete.');
          fabCompleteCheckbox.checked = false;
          await window.electron.updateSpreadsheet(rowIndex, 'Fab Complete', 'FALSE');
        }
      }
    } catch (error) {
      console.error('Error updating spreadsheet:', error.message);
      alert(`Error updating spreadsheet: ${error.message}`);
    }
  }

  refreshButton.addEventListener('click', fetchData);

  fetchData(); // Initial fetch on page load
});
