'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { EmployeeOption } from './shared';

type InventorySupplyRoom = {
  id: string;
  name: string;
  createdAt: string;
};

type InventoryItem = {
  id: string;
  supplyRoomId: string;
  itemName: string;
  itemNumber: string;
  qtyOnHand: number;
  par: number;
  unitCost: number;
  lotCount: number;
  nearestExpiration: string;
  orderStatus: string;
  orderedBy: string;
  orderedDate: string;
  expectedDeliveryDate: string;
  receivedDate: string;
  createdAt: string;
};

type InventoryLot = {
  id: string;
  itemId: string;
  lotNumber: string;
  expirationDate: string;
  qtyOnHand: number;
  manufacturer: string;
  notes: string;
  createdAt: string;
};

type InventoryTransaction = {
  id: string;
  itemId: string;
  transactionType: 'ADD' | 'REMOVE' | 'TRANSFER';
  quantity: number;
  reason: string;
  sourceRoomId: string;
  destinationRoomId: string;
  createdBy: string;
  createdAt: string;
};

type InventoryTrackingTileProps = {
  employees: EmployeeOption[];
  authEmail: string;
};

function InventoryTrackingTile({ employees, authEmail }: InventoryTrackingTileProps) {
  const [inventorySupplyRooms, setInventorySupplyRooms] = useState<InventorySupplyRoom[]>([]);
  const [selectedSupplyRoomId, setSelectedSupplyRoomId] = useState('');
  const [showInventoryRoomDetail, setShowInventoryRoomDetail] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [allInventoryLots, setAllInventoryLots] = useState<InventoryLot[]>([]);
  const [inventoryLotsByItemId, setInventoryLotsByItemId] = useState<Record<string, InventoryLot[]>>({});
  const [expandedInventoryItemId, setExpandedInventoryItemId] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [roomInventorySearch, setRoomInventorySearch] = useState('');
  const [roomInventoryFilter, setRoomInventoryFilter] = useState('');
  const [newSupplyRoomName, setNewSupplyRoomName] = useState('');
  const [showCreateSupplyRoomForm, setShowCreateSupplyRoomForm] = useState(false);
  const [showCreateInventoryReports, setShowCreateInventoryReports] = useState(false);
  const [inventoryReportModal, setInventoryReportModal] = useState<string | null>(null);
  const [showCreateInventoryItemForm, setShowCreateInventoryItemForm] = useState(false);
  const [newInventoryItemName, setNewInventoryItemName] = useState('');
  const [newInventoryItemNumber, setNewInventoryItemNumber] = useState('');
  const [newInventoryItemPar, setNewInventoryItemPar] = useState('');
  const [newInventoryItemUnitCost, setNewInventoryItemUnitCost] = useState('');
  const [selectedAddInventoryItem, setSelectedAddInventoryItem] = useState<InventoryItem | null>(null);
  const [addInventoryQty, setAddInventoryQty] = useState('');
  const [addInventoryLotNumber, setAddInventoryLotNumber] = useState('');
  const [addInventoryExpirationDate, setAddInventoryExpirationDate] = useState('');
  const [addInventoryManufacturer, setAddInventoryManufacturer] = useState('');
  const [addInventoryNotes, setAddInventoryNotes] = useState('');

  const [selectedRemoveInventoryItem, setSelectedRemoveInventoryItem] = useState<InventoryItem | null>(null);
  const [removeInventoryQty, setRemoveInventoryQty] = useState('');
  const [removeInventoryReason, setRemoveInventoryReason] = useState('Expired');

  const [selectedTransferInventoryItem, setSelectedTransferInventoryItem] = useState<InventoryItem | null>(null);
  const [transferInventoryQty, setTransferInventoryQty] = useState('');
  const [transferDestinationRoomId, setTransferDestinationRoomId] = useState('');

  const [selectedEditInventoryItem, setSelectedEditInventoryItem] = useState<InventoryItem | null>(null);
  const [editInventoryItemName, setEditInventoryItemName] = useState('');
  const [editInventoryItemNumber, setEditInventoryItemNumber] = useState('');
  const [editInventoryItemPar, setEditInventoryItemPar] = useState('');
  const [editInventoryItemUnitCost, setEditInventoryItemUnitCost] = useState('');

  const [inventoryStatus, setInventoryStatus] = useState('');
  const [inventoryReportStartDate, setInventoryReportStartDate] = useState('');
  const [inventoryReportEndDate, setInventoryReportEndDate] = useState('');
  const [inventoryReportSupplyRoomId, setInventoryReportSupplyRoomId] = useState('');
  const [inventoryReportItemId, setInventoryReportItemId] = useState('');
  const [inventoryReportReason, setInventoryReportReason] = useState('');
  const [inventoryUsageTransactions, setInventoryUsageTransactions] = useState<InventoryTransaction[]>([]);

  const [inventorySupplyRoomsLoaded, setInventorySupplyRoomsLoaded] = useState(false);

  const inventoryToday = new Date(new Date().toDateString());

  const totalInventoryValue = useMemo(
    () => inventoryItems.reduce((total, item) => total + (item.qtyOnHand * item.unitCost), 0),
    [inventoryItems],
  );

  function getInventoryItemLabel(itemId: string) {
    const item = allInventoryItems.find((inventoryItem) => inventoryItem.id === itemId)
      ?? inventoryItems.find((inventoryItem) => inventoryItem.id === itemId);

    return item ? `${item.itemName}${item.itemNumber ? ` (${item.itemNumber})` : ''}` : itemId || '—';
  }

  function getInventoryRoomLabel(roomId: string) {
    const room = inventorySupplyRooms.find((supplyRoom) => supplyRoom.id === roomId);
    return room?.name || roomId || '—';
  }

  function getInventoryUserLabel(createdBy: string) {
    const normalizedCreatedBy = createdBy.trim().toLowerCase();
    const employee = employees.find((employeeOption) => (
      employeeOption.email?.trim().toLowerCase() === normalizedCreatedBy
      || employeeOption.name.trim().toLowerCase() === normalizedCreatedBy
    ));

    return employee?.name || createdBy || '—';
  }

  function getInventoryExpirationClass(expirationDate: string) {
    if (!expirationDate) {
      return 'text-slate-700';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiration = new Date(`${expirationDate}T00:00:00`);
    const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return 'rounded-lg bg-red-100 px-2 py-1 font-bold text-red-800';
    }

    if (daysUntilExpiration <= 30) {
      return 'rounded-lg bg-orange-200 px-2 py-1 font-bold text-orange-900';
    }

    if (daysUntilExpiration <= 90) {
      return 'rounded-lg bg-yellow-100 px-2 py-1 font-bold text-yellow-700';
    }

    return 'text-slate-700';
  }

  async function loadInventorySupplyRooms() {
    const { data, error } = await supabase
      .from('inventory_supply_rooms')
      .select('*')
      .order('name', { ascending: true });

    setInventorySupplyRoomsLoaded(true);

    if (error) {
      console.error('Failed to load inventory supply rooms:', error);
      setInventoryStatus('Unable to load supply rooms.');
      return;
    }

    const rooms = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));

    setInventorySupplyRooms(rooms);
  }

  async function loadAllInventoryItemsForReports() {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Failed to load all inventory items for reports:', error);
      return;
    }

    setAllInventoryItems(
      (data ?? []).map((row: any) => ({
        id: row.id,
        supplyRoomId: row.supply_room_id,
        itemName: row.item_name,
        itemNumber: row.item_number ?? '',
        qtyOnHand: row.qty_on_hand ?? 0,
        par: row.par ?? 0,
        unitCost: row.unit_cost ?? 0,
        lotCount: 0,
        nearestExpiration: '',
        orderStatus: row.order_status ?? 'NEEDS_ORDER',
        orderedBy: row.ordered_by ?? '',
        orderedDate: row.ordered_date ?? '',
        expectedDeliveryDate: row.expected_delivery_date ?? '',
        receivedDate: row.received_date ?? '',
        createdAt: row.created_at,
      })),
    );
  }

  async function loadAllInventoryLotsForSearch() {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select('*')
      .gt('qty_on_hand', 0)
      .order('expiration_date', { ascending: true });

    if (error) {
      console.error('Failed to load all inventory lots for search:', error);
      return;
    }

    setAllInventoryLots(
      (data ?? []).map((lot: any) => ({
        id: lot.id,
        itemId: lot.item_id,
        lotNumber: lot.lot_number ?? '',
        expirationDate: lot.expiration_date ?? '',
        qtyOnHand: lot.qty_on_hand ?? 0,
        manufacturer: lot.manufacturer ?? '',
        notes: lot.notes ?? '',
        createdAt: lot.created_at,
      })),
    );
  }

  async function loadInventoryItems(supplyRoomId: string) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('supply_room_id', supplyRoomId)
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Failed to load inventory items:', error);
      setInventoryStatus('Unable to load inventory items.');
      return;
    }

    const itemIds = (data ?? []).map((row: any) => row.id);
    const lotSummaryByItemId: Record<string, { lotCount: number; nearestExpiration: string }> = {};

    if (itemIds.length > 0) {
      const { data: lots, error: lotsError } = await supabase
        .from('inventory_lots')
        .select('*')
        .in('item_id', itemIds)
        .gt('qty_on_hand', 0)
        .order('expiration_date', { ascending: true });

      if (lotsError) {
        console.error('Failed to load inventory lots:', lotsError);
      } else {
        const lotsByItemId: Record<string, InventoryLot[]> = {};

        (lots ?? []).forEach((lot: any) => {
          const itemId = lot.item_id;
          const current = lotSummaryByItemId[itemId] ?? { lotCount: 0, nearestExpiration: '' };
          const expiration = lot.expiration_date ?? '';

          lotSummaryByItemId[itemId] = {
            lotCount: current.lotCount + 1,
            nearestExpiration:
              expiration && (!current.nearestExpiration || expiration < current.nearestExpiration)
                ? expiration
                : current.nearestExpiration,
          };

          lotsByItemId[itemId] = [
            ...(lotsByItemId[itemId] ?? []),
            {
              id: lot.id,
              itemId,
              lotNumber: lot.lot_number ?? '',
              expirationDate: lot.expiration_date ?? '',
              qtyOnHand: lot.qty_on_hand ?? 0,
              manufacturer: lot.manufacturer ?? '',
              notes: lot.notes ?? '',
              createdAt: lot.created_at,
            },
          ];
        });

        setInventoryLotsByItemId(lotsByItemId);
      }
    } else {
      setInventoryLotsByItemId({});
    }

    setInventoryItems(
      (data ?? []).map((row: any) => ({
        id: row.id,
        supplyRoomId: row.supply_room_id,
        itemName: row.item_name,
        itemNumber: row.item_number ?? '',
        qtyOnHand: row.qty_on_hand ?? 0,
        par: row.par ?? 0,
        unitCost: Number(row.unit_cost ?? 0),
        lotCount: lotSummaryByItemId[row.id]?.lotCount ?? 0,
        nearestExpiration: lotSummaryByItemId[row.id]?.nearestExpiration ?? '',
        orderStatus: row.order_status ?? 'NEEDS_ORDER',
        orderedBy: row.ordered_by ?? '',
        orderedDate: row.ordered_date ?? '',
        expectedDeliveryDate: row.expected_delivery_date ?? '',
        receivedDate: row.received_date ?? '',
        createdAt: row.created_at,
      })),
    );
  }

  function getInventoryOrderStatusLabel(status: string) {
    switch (status) {
      case 'ORDERED':
        return 'Ordered';
      case 'AWAITING_DELIVERY':
        return 'Awaiting Delivery';
      case 'RECEIVED':
        return 'Received';
      case 'NEEDS_ORDER':
      default:
        return 'Needs Order';
    }
  }

  function getInventoryOrderStatusClass(status: string) {
    switch (status) {
      case 'ORDERED':
        return 'bg-blue-100 text-blue-800';
      case 'AWAITING_DELIVERY':
        return 'bg-purple-100 text-purple-800';
      case 'RECEIVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'NEEDS_ORDER':
      default:
        return 'bg-amber-100 text-amber-800';
    }
  }

  async function handleMarkInventoryItemOrdered(item: InventoryItem) {
    setInventoryStatus(`Marking ${item.itemName} as ordered...`);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        order_status: 'ORDERED',
        ordered_by: authEmail || null,
        ordered_date: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      console.error('Failed to mark inventory item ordered:', error);
      setInventoryStatus('Unable to mark item as ordered.');
      return;
    }

    setInventoryStatus(`${item.itemName} marked as ordered.`);
    await loadAllInventoryItemsForReports();

    if (selectedSupplyRoomId) {
      await loadInventoryItems(selectedSupplyRoomId);
    }
  }

  async function handleMarkInventoryItemAwaitingDelivery(item: InventoryItem) {
    setInventoryStatus(`Marking ${item.itemName} as awaiting delivery...`);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        order_status: 'AWAITING_DELIVERY',
        expected_delivery_date: item.expectedDeliveryDate || null,
      })
      .eq('id', item.id);

    if (error) {
      console.error('Failed to mark inventory item awaiting delivery:', error);
      setInventoryStatus('Unable to mark item as awaiting delivery.');
      return;
    }

    setInventoryStatus(`${item.itemName} marked as awaiting delivery.`);
    await loadAllInventoryItemsForReports();

    if (selectedSupplyRoomId) {
      await loadInventoryItems(selectedSupplyRoomId);
    }
  }

  async function handleMarkInventoryItemReceived(item: InventoryItem) {
    setInventoryStatus(`Marking ${item.itemName} as received...`);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        order_status: 'RECEIVED',
        received_date: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      console.error('Failed to mark inventory item received:', error);
      setInventoryStatus('Unable to mark item as received.');
      return;
    }

    setInventoryStatus(`${item.itemName} marked as received. Use Add to place received supplies into inventory.`);
    await loadAllInventoryItemsForReports();

    if (selectedSupplyRoomId) {
      await loadInventoryItems(selectedSupplyRoomId);
    }
  }

  async function handleRunInventoryUsageReport() {
    if (!inventoryReportStartDate || !inventoryReportEndDate) {
      setInventoryStatus('Select a start and end date for the usage report.');
      return;
    }

    if (inventoryReportStartDate > inventoryReportEndDate) {
      setInventoryStatus('Usage report start date must be before the end date.');
      return;
    }

    setInventoryStatus('Running usage report...');

    let query = supabase
      .from('inventory_transactions')
      .select('*')
      .eq('transaction_type', 'REMOVE')
      .gte('created_at', `${inventoryReportStartDate}T00:00:00`)
      .lte('created_at', `${inventoryReportEndDate}T23:59:59`);

    if (inventoryReportSupplyRoomId) {
      query = query.eq('source_room_id', inventoryReportSupplyRoomId);
    }

    if (inventoryReportItemId) {
      query = query.eq('item_id', inventoryReportItemId);
    }

    if (inventoryReportReason) {
      query = query.eq('reason', inventoryReportReason);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load inventory usage report:', error);
      setInventoryStatus('Unable to load usage report.');
      return;
    }

    setInventoryUsageTransactions(
      (data ?? []).map((row: any) => ({
        id: row.id,
        itemId: row.item_id,
        transactionType: row.transaction_type,
        quantity: row.quantity ?? 0,
        reason: row.reason ?? '',
        sourceRoomId: row.source_room_id ?? '',
        destinationRoomId: row.destination_room_id ?? '',
        createdBy: row.created_by ?? '',
        createdAt: row.created_at,
      })),
    );
    setInventoryStatus(`Usage report loaded: ${(data ?? []).length} transaction${(data ?? []).length === 1 ? '' : 's'}.`);
  }

  async function handleCreateInventoryItem() {
    const itemName = newInventoryItemName.trim();
    const itemNumber = newInventoryItemNumber.trim();
    const par = Number(newInventoryItemPar);
    const unitCost = newInventoryItemUnitCost.trim() ? Number(newInventoryItemUnitCost) : 0;

    if (!selectedSupplyRoomId) {
      setInventoryStatus('Select a supply room first.');
      return;
    }

    if (!itemName) {
      setInventoryStatus('Enter an item name.');
      return;
    }

    if (!Number.isFinite(par) || par < 0) {
      setInventoryStatus('Enter a valid PAR.');
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setInventoryStatus('Enter a valid unit cost.');
      return;
    }

    if (itemNumber && inventoryItems.some((item) => item.itemNumber.toLowerCase() === itemNumber.toLowerCase())) {
      setInventoryStatus('An item with this item number already exists in this supply room.');
      return;
    }

    setInventoryStatus('Creating inventory item...');

    const { error } = await supabase.from('inventory_items').insert({
      supply_room_id: selectedSupplyRoomId,
      item_name: itemName,
      item_number: itemNumber || null,
      qty_on_hand: 0,
      par,
      unit_cost: unitCost,
    });

    if (error) {
      console.error('Failed to create inventory item:', error);
      setInventoryStatus('Unable to create inventory item.');
      return;
    }

    setNewInventoryItemName('');
    setNewInventoryItemNumber('');
    setNewInventoryItemPar('');
    setNewInventoryItemUnitCost('');
    setInventoryStatus('Inventory item created.');
    await loadInventoryItems(selectedSupplyRoomId);
    await loadAllInventoryItemsForReports();
  }

  async function handleUpdateInventoryItem() {
    if (!selectedEditInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    const itemName = editInventoryItemName.trim();
    const itemNumber = editInventoryItemNumber.trim();
    const par = Number(editInventoryItemPar);
    const unitCost = editInventoryItemUnitCost.trim() ? Number(editInventoryItemUnitCost) : 0;

    if (!itemName) {
      setInventoryStatus('Enter an item name.');
      return;
    }

    if (!Number.isFinite(par) || par < 0) {
      setInventoryStatus('Enter a valid PAR.');
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setInventoryStatus('Enter a valid unit cost.');
      return;
    }

    if (
      itemNumber &&
      inventoryItems.some(
        (item) =>
          item.id !== selectedEditInventoryItem.id &&
          item.itemNumber.toLowerCase() === itemNumber.toLowerCase(),
      )
    ) {
      setInventoryStatus('An item with this item number already exists in this supply room.');
      return;
    }

    setInventoryStatus('Updating inventory item...');

    const { error } = await supabase
      .from('inventory_items')
      .update({
        item_name: itemName,
        item_number: itemNumber || null,
        par,
        unit_cost: unitCost,
      })
      .eq('id', selectedEditInventoryItem.id);

    if (error) {
      console.error('Failed to update inventory item:', error);
      setInventoryStatus('Unable to update inventory item.');
      return;
    }

    setSelectedEditInventoryItem(null);
    setEditInventoryItemName('');
    setEditInventoryItemNumber('');
    setEditInventoryItemPar('');
    setEditInventoryItemUnitCost('');
    setInventoryStatus('Inventory item updated.');
    await loadInventoryItems(selectedSupplyRoomId);
    await loadAllInventoryItemsForReports();
  }

  async function handleDeleteInventoryItem() {
    if (!selectedEditInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    if (selectedEditInventoryItem.qtyOnHand > 0) {
      setInventoryStatus('Remove or transfer all inventory before deleting this item.');
      return;
    }

    if ((inventoryLotsByItemId[selectedEditInventoryItem.id] ?? []).some((lot) => lot.qtyOnHand > 0)) {
      setInventoryStatus('Remove or transfer all active lots before deleting this item.');
      return;
    }

    const confirmed = window.confirm(`Delete inventory item "${selectedEditInventoryItem.itemName}"?`);

    if (!confirmed) {
      return;
    }

    setInventoryStatus('Deleting inventory item...');

    const { error } = await supabase.from('inventory_items').delete().eq('id', selectedEditInventoryItem.id);

    if (error) {
      console.error('Failed to delete inventory item:', error);
      setInventoryStatus('Unable to delete inventory item.');
      return;
    }

    setSelectedEditInventoryItem(null);
    setEditInventoryItemName('');
    setEditInventoryItemNumber('');
    setEditInventoryItemPar('');
    setInventoryStatus('Inventory item deleted.');
    await loadInventoryItems(selectedSupplyRoomId);
    await loadAllInventoryItemsForReports();
  }

  async function handleAddInventoryQuantity() {
    if (!selectedAddInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    const quantity = Number(addInventoryQty);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setInventoryStatus('Enter a valid quantity.');
      return;
    }

    setInventoryStatus('Adding inventory...');

    const { error: lotError } = await supabase.from('inventory_lots').insert({
      item_id: selectedAddInventoryItem.id,
      supply_room_id: selectedSupplyRoomId,
      lot_number: addInventoryLotNumber.trim() || null,
      expiration_date: addInventoryExpirationDate || null,
      qty_on_hand: quantity,
      manufacturer: addInventoryManufacturer.trim() || null,
      notes: addInventoryNotes.trim() || null,
    });

    if (lotError) {
      console.error('Failed to create inventory lot:', lotError);
      setInventoryStatus('Unable to add inventory lot.');
      return;
    }

    const { error: itemError } = await supabase
      .from('inventory_items')
      .update({ qty_on_hand: selectedAddInventoryItem.qtyOnHand + quantity })
      .eq('id', selectedAddInventoryItem.id);

    if (itemError) {
      console.error('Failed to update inventory item quantity:', itemError);
      setInventoryStatus('Inventory lot was created, but item quantity did not update.');
      return;
    }

    const { error: transactionError } = await supabase.from('inventory_transactions').insert({
      item_id: selectedAddInventoryItem.id,
      transaction_type: 'ADD',
      quantity,
      destination_room_id: selectedSupplyRoomId,
      created_by: authEmail || null,
    });

    if (transactionError) {
      console.error('Failed to create inventory transaction:', transactionError);
      setInventoryStatus('Inventory was added, but transaction history did not save.');
      return;
    }

    setSelectedAddInventoryItem(null);
    setAddInventoryQty('');
    setAddInventoryLotNumber('');
    setAddInventoryExpirationDate('');
    setAddInventoryManufacturer('');
    setAddInventoryNotes('');
    setInventoryStatus('Inventory added.');
    await loadInventoryItems(selectedSupplyRoomId);
    await loadAllInventoryItemsForReports();
  }

  async function handleRemoveInventoryQuantity() {
    if (!selectedRemoveInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    const quantity = Number(removeInventoryQty);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setInventoryStatus('Enter a valid quantity.');
      return;
    }

    setInventoryStatus('Removing inventory...');

    const { data: lots, error: lotsError } = await supabase
      .from('inventory_lots')
      .select('id, qty_on_hand, expiration_date, created_at')
      .eq('item_id', selectedRemoveInventoryItem.id)
      .eq('supply_room_id', selectedSupplyRoomId)
      .gt('qty_on_hand', 0)
      .order('expiration_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (lotsError) {
      console.error('Failed to load inventory lots:', lotsError);
      setInventoryStatus('Unable to load inventory lots.');
      return;
    }

    const lotQtyOnHand = (lots ?? []).reduce((sum, lot) => sum + (lot.qty_on_hand ?? 0), 0);

    if (quantity > lotQtyOnHand) {
      setInventoryStatus('Cannot remove more than qty available in lots.');
      return;
    }

    let remainingToRemove = quantity;

    for (const lot of lots ?? []) {
      if (remainingToRemove <= 0) {
        break;
      }

      const currentLotQty = lot.qty_on_hand ?? 0;
      const removeFromLot = Math.min(currentLotQty, remainingToRemove);
      const newLotQty = currentLotQty - removeFromLot;

      const { error: lotUpdateError } = await supabase
        .from('inventory_lots')
        .update({ qty_on_hand: newLotQty })
        .eq('id', lot.id);

      if (lotUpdateError) {
        console.error('Failed to update inventory lot:', lotUpdateError);
        setInventoryStatus('Unable to update inventory lot.');
        return;
      }

      remainingToRemove -= removeFromLot;
    }

    const { error: cleanupError } = await supabase
      .from('inventory_lots')
      .delete()
      .eq('item_id', selectedRemoveInventoryItem.id)
      .eq('supply_room_id', selectedSupplyRoomId)
      .eq('qty_on_hand', 0);

    if (cleanupError) {
      console.error('Failed to clean up empty lots:', cleanupError);
      setInventoryStatus('Inventory was removed, but empty lots did not clean up.');
      return;
    }

    const updatedQtyOnHand = lotQtyOnHand - quantity;

    const { error: itemError } = await supabase
      .from('inventory_items')
      .update({ qty_on_hand: updatedQtyOnHand })
      .eq('id', selectedRemoveInventoryItem.id);

    if (itemError) {
      console.error('Failed to update inventory item quantity:', itemError);
      setInventoryStatus('Unable to update inventory quantity.');
      return;
    }

    const { error: transactionError } = await supabase.from('inventory_transactions').insert({
      item_id: selectedRemoveInventoryItem.id,
      transaction_type: 'REMOVE',
      quantity,
      reason: removeInventoryReason,
      source_room_id: selectedSupplyRoomId,
      created_by: authEmail || null,
    });

    if (transactionError) {
      console.error('Failed to create inventory transaction:', transactionError);
      setInventoryStatus('Inventory was removed, but transaction history did not save.');
      return;
    }

    setSelectedRemoveInventoryItem(null);
    setRemoveInventoryQty('');
    setRemoveInventoryReason('Expired');
    setInventoryStatus('Inventory removed.');
    await loadInventoryItems(selectedSupplyRoomId);
    await loadAllInventoryItemsForReports();
  }

  async function handleTransferInventoryQuantity() {
    if (!selectedTransferInventoryItem || !selectedSupplyRoomId) {
      setInventoryStatus('Select an inventory item first.');
      return;
    }

    if (!transferDestinationRoomId) {
      setInventoryStatus('Select a destination supply room.');
      return;
    }

    if (transferDestinationRoomId === selectedSupplyRoomId) {
      setInventoryStatus('Destination must be different from source room.');
      return;
    }

    const quantity = Number(transferInventoryQty);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setInventoryStatus('Enter a valid quantity.');
      return;
    }

    if (quantity > selectedTransferInventoryItem.qtyOnHand) {
      setInventoryStatus('Cannot transfer more than qty on hand.');
      return;
    }

    setInventoryStatus('Transferring inventory...');

    const { error: sourceError } = await supabase
      .from('inventory_items')
      .update({ qty_on_hand: selectedTransferInventoryItem.qtyOnHand - quantity })
      .eq('id', selectedTransferInventoryItem.id);

    if (sourceError) {
      console.error('Failed to update source inventory item:', sourceError);
      setInventoryStatus('Unable to update source inventory.');
      return;
    }

    const { data: existingDestinationItem, error: lookupError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('supply_room_id', transferDestinationRoomId)
      .eq('item_number', selectedTransferInventoryItem.itemNumber || '')
      .maybeSingle();

    if (lookupError) {
      console.error('Failed to find destination inventory item:', lookupError);
      setInventoryStatus('Source was updated, but destination lookup failed.');
      return;
    }

    let destinationItemId = existingDestinationItem?.id;

    if (existingDestinationItem) {
      const { error: destinationUpdateError } = await supabase
        .from('inventory_items')
        .update({ qty_on_hand: (existingDestinationItem.qty_on_hand ?? 0) + quantity })
        .eq('id', existingDestinationItem.id);

      if (destinationUpdateError) {
        console.error('Failed to update destination inventory item:', destinationUpdateError);
        setInventoryStatus('Source was updated, but destination update failed.');
        return;
      }
    } else {
      const { data: newDestinationItem, error: destinationInsertError } = await supabase
        .from('inventory_items')
        .insert({
          supply_room_id: transferDestinationRoomId,
          item_name: selectedTransferInventoryItem.itemName,
          item_number: selectedTransferInventoryItem.itemNumber || null,
          qty_on_hand: quantity,
          par: selectedTransferInventoryItem.par,
          unit_cost: selectedTransferInventoryItem.unitCost,
        })
        .select('id')
        .single();

      if (destinationInsertError) {
        console.error('Failed to create destination inventory item:', destinationInsertError);
        setInventoryStatus('Source was updated, but destination item was not created.');
        return;
      }

      destinationItemId = newDestinationItem.id;
    }

    const { error: transactionError } = await supabase.from('inventory_transactions').insert({
      item_id: selectedTransferInventoryItem.id,
      transaction_type: 'TRANSFER',
      quantity,
      source_room_id: selectedSupplyRoomId,
      destination_room_id: transferDestinationRoomId,
      created_by: authEmail || null,
    });

    if (transactionError) {
      console.error('Failed to create inventory transaction:', transactionError);
      setInventoryStatus('Inventory was transferred, but transaction history did not save.');
      return;
    }

    setSelectedTransferInventoryItem(null);
    setTransferInventoryQty('');
    setTransferDestinationRoomId('');
    setInventoryStatus('Inventory transferred.');
    await loadInventoryItems(selectedSupplyRoomId);
    await loadAllInventoryItemsForReports();
  }

  async function handleCreateSupplyRoom() {
    const roomName = newSupplyRoomName.trim();

    if (!roomName) {
      setInventoryStatus('Enter a supply room name.');
      return;
    }

    setInventoryStatus('Creating supply room...');

    const { data, error } = await supabase
      .from('inventory_supply_rooms')
      .insert({ name: roomName })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to create supply room:', error);
      setInventoryStatus('Unable to create supply room.');
      return;
    }

    setNewSupplyRoomName('');
    setInventoryStatus('Supply room created.');
    await loadInventorySupplyRooms();

    if (data?.id) {
      setSelectedSupplyRoomId(data.id);
      setShowInventoryRoomDetail(true);
    }
  }

  async function handleDeleteSupplyRoom(room: InventorySupplyRoom) {
    const confirmed = window.confirm(
      `Delete supply room "${room.name}"? This can only be done if the room has no inventory items.`,
    );

    if (!confirmed) {
      return;
    }

    setInventoryStatus('Checking supply room inventory...');

    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('supply_room_id', room.id)
      .limit(1);

    if (itemsError) {
      console.error('Failed to check supply room inventory:', itemsError);
      setInventoryStatus('Unable to check supply room inventory.');
      return;
    }

    if ((items ?? []).length > 0) {
      setInventoryStatus('Cannot delete supply room. Remove or transfer inventory items first.');
      return;
    }

    setInventoryStatus('Deleting supply room...');

    const { error } = await supabase.from('inventory_supply_rooms').delete().eq('id', room.id);

    if (error) {
      console.error('Failed to delete supply room:', error);
      setInventoryStatus('Unable to delete supply room.');
      return;
    }

    if (selectedSupplyRoomId === room.id) {
      setSelectedSupplyRoomId('');
      setShowInventoryRoomDetail(false);
      setInventoryItems([]);
    }

    setInventoryStatus('Supply room deleted.');
    await loadInventorySupplyRooms();
  }

  // Loads when the tile is first opened, and again each time it is reopened,
  // so inventory is current without being fetched for supervisors who never
  // open this tile.
  useEffect(() => {
    // The loaders only set state after their requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventorySupplyRooms();
    loadAllInventoryItemsForReports();
    loadAllInventoryLotsForSearch();
  }, []);

  useEffect(() => {
    if (!selectedSupplyRoomId) {
      setInventoryItems([]);
      return;
    }

    loadInventoryItems(selectedSupplyRoomId);
  }, [selectedSupplyRoomId]);

  return (
    <>
      <div className="space-y-4">
        {!showInventoryRoomDetail && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Supply Rooms</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowCreateInventoryReports((value) => !value)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                {showCreateInventoryReports ? 'Hide Inventory Reports' : 'Run Inventory Reports'}
              </button>

              <button
                type="button"
                onClick={() => setShowCreateSupplyRoomForm((value) => !value)}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                {showCreateSupplyRoomForm ? 'Cancel' : 'Add Supply Room'}
              </button>
            </div>
          </div>

          {showCreateSupplyRoomForm && (
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1 text-xs font-semibold text-slate-600">
                New Supply Room Name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={newSupplyRoomName}
                  onChange={(event) => setNewSupplyRoomName(event.target.value)}
                  placeholder="Main Supply Room"
                />
              </label>

              <button
                type="button"
                onClick={handleCreateSupplyRoom}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                Create Supply Room
              </button>
            </div>
          )}

          {showCreateInventoryReports && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-bold text-slate-900">Inventory Reports</div>
              <div className="mt-1 text-xs text-slate-500">
                Report tools will be added here for usage, transfers, expirations, low stock, and inventory value.
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  'Usage by Date Range',
                  'Order List',
                  'Expiration Management',
                  'Inventory Value',
                ].map((reportName) => (
                  <button
                    key={reportName}
                    type="button"
                    onClick={() => setInventoryReportModal(reportName)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    {reportName}
                  </button>
                ))}
              </div>

              {inventoryReportModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
                  <div className="apollo-print-report mt-6 max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
                    <style>{`
                      @media print {
                        body * {
                          visibility: hidden;
                        }

                        .apollo-print-report,
                        .apollo-print-report * {
                          visibility: visible;
                        }

                        .apollo-print-report {
                          position: absolute !important;
                          left: 0 !important;
                          top: 0 !important;
                          width: 100% !important;
                          max-width: none !important;
                          max-height: none !important;
                          overflow: visible !important;
                          border-radius: 0 !important;
                          box-shadow: none !important;
                          padding: 16px !important;
                        }

                        .apollo-no-print {
                          display: none !important;
                        }

                        table {
                          page-break-inside: auto;
                        }

                        tr {
                          page-break-inside: avoid;
                          page-break-after: auto;
                        }
                      }
                    `}</style>
                    <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-lg font-bold text-slate-900">{inventoryReportModal}</div>
                        <div className="text-sm text-slate-500">Inventory report viewer</div>
                      </div>
                      <div className="apollo-no-print flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          onClick={() => window.print()}
                        >
                          Print / Save PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setInventoryReportModal(null)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-bold text-slate-900">Report Parameters</div>

                      {inventoryReportModal === 'Usage by Date Range' || inventoryReportModal === 'Order List' || inventoryReportModal === 'Expiration Management' || inventoryReportModal === 'Inventory Value' ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Supply Room</div>
                            {inventoryReportModal === 'Usage by Date Range' || inventoryReportModal === 'Order List' || inventoryReportModal === 'Expiration Management' || inventoryReportModal === 'Inventory Value' ? (
                              <>
                                <select
                                  value={inventoryReportSupplyRoomId}
                                  onChange={(event) => setInventoryReportSupplyRoomId(event.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                                >
                                  <option value="">All Supply Rooms</option>
                                  {inventorySupplyRooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                      {room.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="mt-1 text-xs text-slate-500">
                                  {inventoryReportModal === 'Usage by Date Range'
                                    ? 'Filters usage transactions by source supply room.'
                                    : inventoryReportModal === 'Order List'
                                      ? 'Builds an order worksheet for one supply room or all supply rooms.'
                                      : 'Calculates inventory value for one supply room or all supply rooms.'}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="mt-1 text-sm font-bold text-slate-900">
                                  {inventorySupplyRooms.find((room) => room.id === selectedSupplyRoomId)?.name ?? 'Selected Supply Room'}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">This report uses the currently selected supply room.</div>
                              </>
                            )}
                          </div>

                          {inventoryReportModal === 'Order List' && (
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              {(() => {
                                const orderItems = allInventoryItems
                                  .filter((item) => item.par > 0 && item.qtyOnHand < item.par)
                                  .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId);

                                const supplyRoomCount = new Set(orderItems.map((item) => item.supplyRoomId)).size;
                                const totalUnitsToOrder = orderItems.reduce((sum, item) => sum + (item.par - item.qtyOnHand), 0);

                                return (
                                  <>
                                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Order Summary</div>
                                    <div className="mt-2 grid gap-2 text-sm">
                                      <div className="flex justify-between gap-3">
                                        <span className="text-slate-600">Supply Rooms Included</span>
                                        <span className="font-bold text-slate-900">{supplyRoomCount}</span>
                                      </div>
                                      <div className="flex justify-between gap-3">
                                        <span className="text-slate-600">Items Requiring Order</span>
                                        <span className="font-bold text-slate-900">{orderItems.length}</span>
                                      </div>
                                      <div className="flex justify-between gap-3">
                                        <span className="text-slate-600">Total Units To Order</span>
                                        <span className="font-bold text-red-700">{totalUnitsToOrder}</span>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {(inventoryReportModal === 'Inventory Value' || inventoryReportModal === 'Expiration Management') && (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-xs font-semibold text-slate-700">
                                  Item
                                  <select
                                    value={inventoryReportItemId}
                                    onChange={(event) => setInventoryReportItemId(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                  >
                                    <option value="">All Items</option>
                                    {allInventoryItems
                                      .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId)
                                      .map((item) => (
                                        <option key={item.id} value={item.id}>
                                          {item.itemName}{item.itemNumber ? ` (${item.itemNumber})` : ''}
                                        </option>
                                      ))}
                                  </select>
                                </label>

                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                  {inventoryReportModal === 'Expiration Management'
                                    ? 'This report includes expired lots and active lots expiring within 90 days.'
                                    : 'This report calculates value using Qty On Hand × Unit Cost. Items with no unit cost entered will calculate as $0.00.'}
                                </div>
                              </div>
                            </div>
                          )}

                          {inventoryReportModal === 'Usage by Date Range' && (
                            <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                              <div className="grid gap-3 md:grid-cols-5">
                                <label className="text-xs font-semibold text-slate-700">
                                  Start Date
                                  <input
                                    type="date"
                                    value={inventoryReportStartDate}
                                    onChange={(event) => setInventoryReportStartDate(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                  />
                                </label>

                                <label className="text-xs font-semibold text-slate-700">
                                  End Date
                                  <input
                                    type="date"
                                    value={inventoryReportEndDate}
                                    onChange={(event) => setInventoryReportEndDate(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                  />
                                </label>

                                <label className="text-xs font-semibold text-slate-700">
                                  Item
                                  <select
                                    value={inventoryReportItemId}
                                    onChange={(event) => setInventoryReportItemId(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                  >
                                    <option value="">All Items</option>
                                    {allInventoryItems.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.itemName}{item.itemNumber ? ` (${item.itemNumber})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="text-xs font-semibold text-slate-700">
                                  Reason
                                  <select
                                    value={inventoryReportReason}
                                    onChange={(event) => setInventoryReportReason(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                                  >
                                    <option value="">All Reasons</option>
                                    <option value="Expired">Expired</option>
                                    <option value="Damaged">Damaged</option>
                                    <option value="Shrink">Shrink</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </label>

                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={handleRunInventoryUsageReport}
                                    className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                                  >
                                    Run Usage Report
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-600">
                          Parameters for this report will be shown here as each report is moved into this viewer.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900">Report Results</div>
                        {inventoryReportModal === 'Expiration Management' && (
                          <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-900">
                            Expiration Review
                          </div>
                        )}
                        {inventoryReportModal === 'Inventory Value' && (
                          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                            ${totalInventoryValue.toFixed(2)}
                          </div>
                        )}
                        {inventoryReportModal === 'Usage by Date Range' && (
                          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">
                            {inventoryUsageTransactions.length} transaction{inventoryUsageTransactions.length === 1 ? '' : 's'}
                          </div>
                        )}
                        {inventoryReportModal === 'Order List' && (
                          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
                            Order Worksheet
                          </div>
                        )}
                      </div>

                      {inventoryReportModal === 'Expiration Management' ? (
                        (() => {
                          const expirationLots = allInventoryLots
                            .map((lot) => {
                              const item = allInventoryItems.find((inventoryItem) => inventoryItem.id === lot.itemId);

                              if (!item || !lot.expirationDate) return null;

                              const expiration = new Date(`${lot.expirationDate}T00:00:00`);
                              const daysUntilExpiration = Math.ceil((expiration.getTime() - inventoryToday.getTime()) / (1000 * 60 * 60 * 24));

                              if (daysUntilExpiration > 90) return null;
                              if (inventoryReportSupplyRoomId && item.supplyRoomId !== inventoryReportSupplyRoomId) return null;
                              if (inventoryReportItemId && item.id !== inventoryReportItemId) return null;

                              return { item, lot, daysUntilExpiration };
                            })
                            .filter((entry): entry is { item: InventoryItem; lot: InventoryLot; daysUntilExpiration: number } => Boolean(entry))
                            .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

                          const expiredCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration < 0).length;
                          const expiresTodayCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration === 0).length;
                          const expiresThirtyCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration >= 1 && daysUntilExpiration <= 30).length;
                          const expiresNinetyCount = expirationLots.filter(({ daysUntilExpiration }) => daysUntilExpiration >= 31 && daysUntilExpiration <= 90).length;

                          return expirationLots.length === 0 ? (
                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                              No expired or expiring lots found for the selected report parameters.
                            </div>
                          ) : (
                            <div className="mt-4 space-y-4">
                              <div className="grid gap-3 md:grid-cols-4">
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-red-700">Expired</div>
                                  <div className="mt-1 text-2xl font-black text-red-800">{expiredCount}</div>
                                </div>
                                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-orange-700">Expires Today</div>
                                  <div className="mt-1 text-2xl font-black text-orange-800">{expiresTodayCount}</div>
                                </div>
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Expiring 1-30 Days</div>
                                  <div className="mt-1 text-2xl font-black text-amber-800">{expiresThirtyCount}</div>
                                </div>
                                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-yellow-700">Expiring 31-90 Days</div>
                                  <div className="mt-1 text-2xl font-black text-yellow-800">{expiresNinetyCount}</div>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-slate-800">
                                    <tr className="rounded-xl border-2 border-slate-700 bg-white shadow-sm transition-colors hover:bg-slate-50">
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Supply Room</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Item</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Item Number</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Lot Number</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Manufacturer</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Qty On Hand</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Expiration Date</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Days Remaining</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {expirationLots.map(({ item, lot, daysUntilExpiration }) => {
                                      const statusText = daysUntilExpiration < 0
                                        ? `${Math.abs(daysUntilExpiration)} day${Math.abs(daysUntilExpiration) === 1 ? '' : 's'} expired`
                                        : daysUntilExpiration === 0
                                          ? 'Expires Today'
                                          : `${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}`;

                                      const statusClass = daysUntilExpiration < 0
                                        ? 'rounded-full bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700'
                                        : daysUntilExpiration <= 30
                                          ? 'rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800'
                                          : 'rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-bold text-yellow-800';

                                      const supplyRoomName = inventorySupplyRooms.find((room) => room.id === item.supplyRoomId)?.name ?? 'Selected Supply Room';

                                      return (
                                        <tr key={lot.id} className="border-t border-slate-100">
                                          <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{supplyRoomName}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{item.itemName}</td>
                                          <td className="px-3 py-2 text-slate-600">{item.itemNumber || '—'}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{lot.lotNumber || '—'}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{lot.manufacturer || '—'}</td>
                                          <td className="px-3 py-2 font-bold text-slate-900">{lot.qtyOnHand}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3">
                                            <span className={getInventoryExpirationClass(lot.expirationDate)}>
                                              {lot.expirationDate}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 font-bold text-slate-900">{daysUntilExpiration}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3">
                                            <span className={statusClass}>{statusText}</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()
                      ) : inventoryReportModal === 'Usage by Date Range' ? (
                        inventoryUsageTransactions.length === 0 ? (
                          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                            No usage transactions loaded for the selected date range.
                          </div>
                        ) : (
                          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-800">
                                <tr>
                                  <th className="border-y-2 border-slate-700 px-3 py-3">Date</th>
                                  <th className="border-y-2 border-slate-700 px-3 py-3">Item</th>
                                  <th className="border-y-2 border-slate-700 px-3 py-3">Qty Removed</th>
                                  <th className="border-y-2 border-slate-700 px-3 py-3">Reason</th>
                                  <th className="border-y-2 border-slate-700 px-3 py-3">Source Room</th>
                                  <th className="border-y-2 border-slate-700 px-3 py-3">Created By</th>
                                </tr>
                              </thead>
                              <tbody>
                                {inventoryUsageTransactions.map((transaction) => (
                                  <tr key={transaction.id} className="border-t border-slate-100">
                                    <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">
                                      {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '—'}
                                    </td>
                                    <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{getInventoryItemLabel(transaction.itemId)}</td>
                                    <td className="px-3 py-2 font-bold text-slate-900">{transaction.quantity}</td>
                                    <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{transaction.reason || '—'}</td>
                                    <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{getInventoryRoomLabel(transaction.sourceRoomId)}</td>
                                    <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{getInventoryUserLabel(transaction.createdBy)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : inventoryReportModal === 'Order List' ? (
                        (() => {
                          const orderItems = allInventoryItems
                            .filter((item) => item.par > 0 && item.qtyOnHand < item.par)
                            .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId)
                            .sort((a, b) => {
                              const roomCompare = getInventoryRoomLabel(a.supplyRoomId).localeCompare(getInventoryRoomLabel(b.supplyRoomId));
                              if (roomCompare !== 0) return roomCompare;
                              return (b.par - b.qtyOnHand) - (a.par - a.qtyOnHand);
                            });

                          const groupedOrderItems = inventorySupplyRooms
                            .map((room) => ({
                              room,
                              items: orderItems.filter((item) => item.supplyRoomId === room.id),
                            }))
                            .filter((group) => group.items.length > 0);

                          const generatedAt = new Date().toLocaleString();

                          return orderItems.length === 0 ? (
                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                              No items currently require ordering for the selected supply room filter.
                            </div>
                          ) : (
                            <div className="mt-4 space-y-4">
                              {groupedOrderItems.map(({ room, items }) => (
                                <div key={room.id} className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="text-sm font-bold text-slate-900">{room.name}</div>
                                    <div className="mt-1 text-xs font-semibold text-slate-500">
                                      {items.length} item{items.length === 1 ? '' : 's'} requiring order • {items.reduce((sum, item) => sum + (item.par - item.qtyOnHand), 0)} unit{items.reduce((sum, item) => sum + (item.par - item.qtyOnHand), 0) === 1 ? '' : 's'} to order
                                    </div>
                                  </div>
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-800">
                                      <tr>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">Ordered</th>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">Item Name</th>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">Item Number</th>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">Qty On Hand</th>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">PAR</th>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">Qty To Order</th>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">Status</th>
                                        <th className="border-y-2 border-slate-700 px-3 py-3">Qty Ordered</th>
                                        <th className="apollo-no-print px-3 py-2">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((item) => (
                                        <tr key={item.id} className="border-t border-slate-100">
                                          <td className="px-3 py-2 text-center">
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-400 bg-white text-xs font-bold text-blue-700">
                                              {item.orderStatus === 'ORDERED' || item.orderStatus === 'AWAITING_DELIVERY' || item.orderStatus === 'RECEIVED' ? '✓' : ''}
                                            </span>
                                          </td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{item.itemName}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.itemNumber || '—'}</td>
                                          <td className="px-3 py-2 font-bold text-slate-900">{item.qtyOnHand}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.par}</td>
                                          <td className="px-3 py-2 font-bold text-red-700">
                                            {item.par - item.qtyOnHand}
                                          </td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3">
                                            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${getInventoryOrderStatusClass(item.orderStatus)}`}>
                                              {getInventoryOrderStatusLabel(item.orderStatus)}
                                            </span>
                                            {item.orderedBy && (
                                              <div className="mt-1 text-[10px] text-slate-500">
                                                Ordered by {getInventoryUserLabel(item.orderedBy)}
                                              </div>
                                            )}
                                            {item.orderedDate && (
                                              <div className="text-[10px] text-slate-500">
                                                Ordered {new Date(item.orderedDate).toLocaleString()}
                                              </div>
                                            )}
                                            {item.orderStatus === 'AWAITING_DELIVERY' && (
                                              <div className="mt-1 text-[10px] font-bold text-purple-700">
                                                Awaiting delivery
                                              </div>
                                            )}
                                            {item.receivedDate && (
                                              <div className="mt-1 text-[10px] font-bold text-emerald-700">
                                                Received {new Date(item.receivedDate).toLocaleString()}
                                              </div>
                                            )}
                                          </td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3">
                                            <div className="h-6 min-w-20 border-b border-slate-400"></div>
                                          </td>
                                          <td className="apollo-no-print px-3 py-2">
                                            {item.orderStatus === 'ORDERED' ? (
                                              <button
                                                type="button"
                                                onClick={() => handleMarkInventoryItemAwaitingDelivery(item)}
                                                className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100"
                                              >
                                                Awaiting Delivery
                                              </button>
                                            ) : item.orderStatus === 'AWAITING_DELIVERY' ? (
                                              <button
                                                type="button"
                                                onClick={() => handleMarkInventoryItemReceived(item)}
                                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                                              >
                                                Received
                                              </button>
                                            ) : item.orderStatus === 'RECEIVED' ? (
                                              <button
                                                type="button"
                                                disabled
                                                className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400"
                                              >
                                                Received
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => handleMarkInventoryItemOrdered(item)}
                                                className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                                              >
                                                Mark Ordered
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ))}

                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                                <div><span className="font-bold text-slate-900">Generated:</span> {generatedAt}</div>
                                <div><span className="font-bold text-slate-900">Total Items Requiring Order:</span> {orderItems.length}</div>
                              </div>
                            </div>
                          );
                        })()
                      ) : inventoryReportModal === 'Inventory Value' ? (
                        (() => {
                          const valueItems = allInventoryItems
                            .filter((item) => !inventoryReportSupplyRoomId || item.supplyRoomId === inventoryReportSupplyRoomId)
                            .filter((item) => !inventoryReportItemId || item.id === inventoryReportItemId)
                            .sort((a, b) => (b.qtyOnHand * b.unitCost) - (a.qtyOnHand * a.unitCost));

                          const valueTotal = valueItems.reduce((sum, item) => sum + (item.qtyOnHand * item.unitCost), 0);
                          const totalUnits = valueItems.reduce((sum, item) => sum + item.qtyOnHand, 0);
                          const itemsMissingCost = valueItems.filter((item) => item.qtyOnHand > 0 && item.unitCost <= 0).length;
                          const valueBySupplyRoom = inventorySupplyRooms
                            .map((room) => {
                              const roomItems = valueItems.filter((item) => item.supplyRoomId === room.id);
                              const roomValue = roomItems.reduce((sum, item) => sum + (item.qtyOnHand * item.unitCost), 0);
                              const roomUnits = roomItems.reduce((sum, item) => sum + item.qtyOnHand, 0);

                              return {
                                roomId: room.id,
                                roomName: room.name,
                                itemCount: roomItems.length,
                                roomUnits,
                                roomValue,
                              };
                            })
                            .filter((roomSummary) => roomSummary.itemCount > 0)
                            .sort((a, b) => b.roomValue - a.roomValue);

                          const topValueItems = valueItems
                            .filter((item) => item.qtyOnHand > 0)
                            .slice(0, 10);

                          return valueItems.length === 0 ? (
                            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                              No inventory items found for the selected report parameters.
                            </div>
                          ) : (
                            <div className="mt-4 space-y-4">
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Total Inventory Value</div>
                                  <div className="mt-1 text-2xl font-black text-emerald-800">${valueTotal.toFixed(2)}</div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Items Included</div>
                                  <div className="mt-1 text-2xl font-black text-slate-900">{valueItems.length}</div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Total Units On Hand</div>
                                  <div className="mt-1 text-2xl font-black text-slate-900">{totalUnits}</div>
                                </div>
                              </div>

                              {itemsMissingCost > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                                  {itemsMissingCost} item{itemsMissingCost === 1 ? '' : 's'} with quantity on hand have no unit cost entered, so their value is calculating as $0.00.
                                </div>
                              )}

                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-white">
                                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                                    Inventory Value by Supply Room
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100 text-slate-800">
                                        <tr>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Supply Room</th>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Items</th>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Units</th>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {valueBySupplyRoom.map((roomSummary) => (
                                          <tr key={roomSummary.roomId} className="border-t border-slate-100">
                                            <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{roomSummary.roomName}</td>
                                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{roomSummary.itemCount}</td>
                                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{roomSummary.roomUnits}</td>
                                            <td className="px-3 py-2 font-bold text-emerald-700">${roomSummary.roomValue.toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-slate-200 bg-white">
                                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900">
                                    Top Value Items
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100 text-slate-800">
                                        <tr>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Item</th>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Qty</th>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Unit Cost</th>
                                          <th className="border-y-2 border-slate-700 px-3 py-3">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {topValueItems.map((item) => {
                                          const inventoryValue = item.qtyOnHand * item.unitCost;

                                          return (
                                            <tr key={item.id} className="border-t border-slate-100">
                                              <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{item.itemName}</td>
                                              <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.qtyOnHand}</td>
                                              <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">${item.unitCost.toFixed(2)}</td>
                                              <td className="px-3 py-2 font-bold text-emerald-700">${inventoryValue.toFixed(2)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-slate-800">
                                    <tr>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Supply Room</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Item</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Item Number</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Qty On Hand</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Unit Cost</th>
                                      <th className="border-y-2 border-slate-700 px-3 py-3">Inventory Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {valueItems.map((item) => {
                                      const inventoryValue = item.qtyOnHand * item.unitCost;
                                      const supplyRoomName = inventorySupplyRooms.find((room) => room.id === item.supplyRoomId)?.name ?? 'Unknown Room';

                                      return (
                                        <tr key={item.id} className="border-t border-slate-100">
                                          <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{supplyRoomName}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{item.itemName}</td>
                                          <td className="px-3 py-2 text-slate-600">{item.itemNumber || '—'}</td>
                                          <td className="px-3 py-2 font-bold text-slate-900">{item.qtyOnHand}</td>
                                          <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">${item.unitCost.toFixed(2)}</td>
                                          <td className="px-3 py-2 font-bold text-emerald-700">${inventoryValue.toFixed(2)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                                      <td colSpan={5} className="px-3 py-3 text-right font-bold text-slate-900">
                                        Total Inventory Value
                                      </td>
                                      <td className="px-3 py-3 font-bold text-emerald-700">
                                        ${valueTotal.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="mt-2 text-sm text-slate-600">
                          Report results will appear here as each report is moved into this viewer.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}



            </div>
          )}

          {inventoryStatus && <div className="mt-3 text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
        </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {inventorySupplyRooms.length === 0 ? (
            <div className="text-sm text-slate-600">{inventorySupplyRoomsLoaded ? 'No supply rooms have been created yet.' : 'Loading supply rooms…'}</div>
          ) : (
            <div className="space-y-4">
              {!showInventoryRoomDetail && (
                <div>
                  <div className="text-sm font-bold text-slate-900">Supply Rooms</div>

                  <div className="mt-3">
                    <input
                      type="text"
                      value={inventorySearch}
                      onChange={(event) => setInventorySearch(event.target.value)}
                      placeholder="Search inventory by item name or SKU..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  {inventorySearch.trim() && (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-800">
                          <tr>
                            <th className="border-y-2 border-slate-700 px-3 py-3">Item</th>
                            <th className="border-y-2 border-slate-700 px-3 py-3">Match</th>
                            <th className="border-y-2 border-slate-700 px-3 py-3">Supply Room</th>
                            <th className="border-y-2 border-slate-700 px-3 py-3">Qty</th>
                            <th className="border-y-2 border-slate-700 px-3 py-3">PAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const search = inventorySearch.trim().toLowerCase();
                            const itemMatches = allInventoryItems
                              .filter((item) =>
                                item.itemName.toLowerCase().includes(search) ||
                                item.itemNumber.toLowerCase().includes(search)
                              )
                              .map((item) => ({
                                item,
                                matchLabel: item.itemName.toLowerCase().includes(search) ? 'Item Name' : 'Item Number',
                                matchValue: item.itemName.toLowerCase().includes(search) ? item.itemName : item.itemNumber,
                              }));

                            const lotMatches = allInventoryLots
                              .filter((lot) =>
                                lot.lotNumber.toLowerCase().includes(search) ||
                                lot.manufacturer.toLowerCase().includes(search)
                              )
                              .map((lot) => {
                                const item = allInventoryItems.find((inventoryItem) => inventoryItem.id === lot.itemId);

                                if (!item) return null;

                                return {
                                  item,
                                  matchLabel: lot.lotNumber.toLowerCase().includes(search) ? 'Lot Number' : 'Manufacturer',
                                  matchValue: lot.lotNumber.toLowerCase().includes(search) ? lot.lotNumber : lot.manufacturer,
                                };
                              })
                              .filter((result): result is { item: InventoryItem; matchLabel: string; matchValue: string } => Boolean(result));

                            const searchResults = [...itemMatches, ...lotMatches]
                              .filter((result, index, results) => results.findIndex((candidate) => candidate.item.id === result.item.id && candidate.matchLabel === result.matchLabel && candidate.matchValue === result.matchValue) === index)
                              .slice(0, 25);

                            if (searchResults.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                                    No inventory matches found.
                                  </td>
                                </tr>
                              );
                            }

                            return searchResults.map(({ item, matchLabel, matchValue }) => {
                              const roomName =
                                inventorySupplyRooms.find((room) => room.id === item.supplyRoomId)?.name ??
                                'Unknown Room';

                              return (
                                <tr
                                  key={`${item.id}-${matchLabel}-${matchValue}`}
                                  className="cursor-pointer border-t border-slate-100 hover:bg-blue-50"
                                  onClick={() => {
                                    setSelectedSupplyRoomId(item.supplyRoomId);
                                    setShowInventoryRoomDetail(true);
                                    setExpandedInventoryItemId(item.id);
                                    setInventorySearch('');
                                  }}
                                >
                                  <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">{item.itemName}</td>
                                  <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">
                                    <span className="font-bold text-slate-900">{matchLabel}:</span> {matchValue || '—'}
                                  </td>
                                  <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{roomName}</td>
                                  <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.qtyOnHand}</td>
                                  <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.par}</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {inventorySupplyRooms.map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          setSelectedSupplyRoomId(room.id);
                          setShowInventoryRoomDetail(true);
                        }}
                        className={`rounded-xl border-2 p-4 text-left shadow-md transition-all hover:-translate-y-0.5 ${
                          selectedSupplyRoomId === room.id
                            ? 'border-blue-600 bg-blue-50 shadow-lg'
                            : 'border-slate-700 bg-slate-50 hover:bg-slate-100 hover:shadow-lg'
                        }`}
                      >
                        <div className="text-sm font-bold text-slate-900">{room.name}</div>
                        <div className="mt-1 text-xs text-slate-500">Open inventory room</div>
                        <div className="mt-3">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteSupplyRoom(room);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                handleDeleteSupplyRoom(room);
                              }
                            }}
                            className="inline-flex rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            Delete Supply Room
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showInventoryRoomDetail && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
                  <div className="mt-6 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
                    <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-lg font-bold text-slate-900">
                          {inventorySupplyRooms.find((room) => room.id === selectedSupplyRoomId)?.name ?? 'Supply Room'}
                        </div>
                        <div className="text-sm text-slate-500">Inventory detail</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowInventoryRoomDetail(false);
                          setSelectedSupplyRoomId('');
                          setRoomInventorySearch('');
                          setRoomInventoryFilter('');
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-bold text-slate-900">Inventory Items</div>
                        <button
                          type="button"
                          onClick={() => setShowCreateInventoryItemForm((value) => !value)}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                        >
                          {showCreateInventoryItemForm ? 'Cancel' : 'Add Inventory Item'}
                        </button>
                      </div>

                      {showCreateInventoryItemForm && (
                        <> 
                      <div className="mt-3 grid gap-3 md:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                          Item Name
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={newInventoryItemName}
                            onChange={(event) => setNewInventoryItemName(event.target.value)}
                            placeholder="Nitroglycerin Sublingual Tabs"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                          Item Number / SKU
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={newInventoryItemNumber}
                            onChange={(event) => setNewInventoryItemNumber(event.target.value)}
                            placeholder="0639-01"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                          PAR
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={newInventoryItemPar}
                            onChange={(event) => setNewInventoryItemPar(event.target.value)}
                            inputMode="numeric"
                            placeholder="12"
                          />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                          Unit Cost
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={newInventoryItemUnitCost}
                            onChange={(event) => setNewInventoryItemUnitCost(event.target.value)}
                            inputMode="decimal"
                            placeholder="0.00"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
                        <button
                          type="button"
                          onClick={handleCreateInventoryItem}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                        >
                          Create Item
                        </button>
                        {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
                      </div>
                        </>
                      )}
                    </div>

                    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                          Search This Supply Room
                          <input
                            type="text"
                            value={roomInventorySearch}
                            onChange={(event) => setRoomInventorySearch(event.target.value)}
                            placeholder="Search by item name or SKU..."
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                          Filter
                          <select
                            value={roomInventoryFilter}
                            onChange={(event) => setRoomInventoryFilter(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="">All Items</option>
                            <option value="ORDER_NOW">Order Now</option>
                            <option value="ORDER_SOON">Order Soon</option>
                            <option value="OK">OK</option>
                            <option value="LOW_STOCK">Below PAR</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="EXPIRING_SOON">Expiring Within 90 Days</option>
                            <option value="HAS_LOTS">Has Active Lots</option>
                            <option value="NO_LOTS">No Active Lots</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Item Name</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Item Number</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Qty on Hand</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">PAR</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Lots</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Nearest Expiration</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Variance</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Order Status</th>
                      <th className="border-y-2 border-slate-700 px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const visibleInventoryItems = inventoryItems.filter((item) => {
                        const search = roomInventorySearch.trim().toLowerCase();
                        const variance = item.qtyOnHand - item.par;
                        const orderStatus =
                          item.par > 0 && item.qtyOnHand <= item.par * 0.25
                            ? 'Order Now'
                            : item.par > 0 && item.qtyOnHand <= item.par * 0.5
                              ? 'Order Soon'
                              : 'OK';

                        const itemMatchesSearch =
                          !search ||
                          item.itemName.toLowerCase().includes(search) ||
                          item.itemNumber.toLowerCase().includes(search);

                        const itemExpiration = item.nearestExpiration ? new Date(`${item.nearestExpiration}T00:00:00`) : null;
                        const daysUntilExpiration = itemExpiration
                          ? Math.ceil((itemExpiration.getTime() - inventoryToday.getTime()) / (1000 * 60 * 60 * 24))
                          : null;

                        const itemMatchesFilter =
                          !roomInventoryFilter ||
                          (roomInventoryFilter === 'ORDER_NOW' && orderStatus === 'Order Now') ||
                          (roomInventoryFilter === 'ORDER_SOON' && orderStatus === 'Order Soon') ||
                          (roomInventoryFilter === 'OK' && orderStatus === 'OK') ||
                          (roomInventoryFilter === 'LOW_STOCK' && item.par > 0 && variance < 0) ||
                          (roomInventoryFilter === 'EXPIRED' && daysUntilExpiration !== null && daysUntilExpiration < 0) ||
                          (roomInventoryFilter === 'EXPIRING_SOON' && daysUntilExpiration !== null && daysUntilExpiration >= 0 && daysUntilExpiration <= 90) ||
                          (roomInventoryFilter === 'HAS_LOTS' && item.lotCount > 0) ||
                          (roomInventoryFilter === 'NO_LOTS' && item.lotCount === 0);

                        return itemMatchesSearch && itemMatchesFilter;
                      });

                      if (inventoryItems.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="px-3 py-4 text-center text-slate-500">
                              No inventory items have been added to this supply room yet.
                            </td>
                          </tr>
                        );
                      }

                      if (visibleInventoryItems.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="px-3 py-4 text-center text-slate-500">
                              No inventory items match the current search or filter.
                            </td>
                          </tr>
                        );
                      }

                      return visibleInventoryItems.map((item) => {
                        const variance = item.qtyOnHand - item.par;
                        const orderStatus =
                          item.par > 0 && item.qtyOnHand <= item.par * 0.25
                            ? 'Order Now'
                            : item.par > 0 && item.qtyOnHand <= item.par * 0.5
                              ? 'Order Soon'
                              : 'OK';

                        return (
                          <React.Fragment key={item.id}>
                          <tr>
                            <td className="border-y-2 border-slate-700 px-3 py-3 font-semibold text-slate-900">
                              <button
                                type="button"
                                onClick={() => setExpandedInventoryItemId((current) => (current === item.id ? '' : item.id))}
                                className="text-left font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                              >
                                {item.itemName}
                              </button>
                            </td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.itemNumber || '—'}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.qtyOnHand}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.par}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{item.lotCount}</td>
                            <td className="border-y-2 border-slate-700 px-3 py-3">
                              <span className={getInventoryExpirationClass(item.nearestExpiration)}>
                                {item.nearestExpiration || '—'}
                              </span>
                            </td>
                            <td className="border-y-2 border-slate-700 px-3 py-3 text-slate-700">{variance}</td>
                            <td
                              className={`border-y-2 border-slate-700 px-3 py-3 font-semibold ${
                                orderStatus === 'Order Now'
                                  ? 'text-red-700'
                                  : orderStatus === 'Order Soon'
                                    ? 'text-amber-600'
                                    : 'text-green-700'
                              }`}
                            >
                              {orderStatus}
                            </td>
                            <td className="rounded-r-xl border-y-2 border-r-2 border-slate-700 px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEditInventoryItem(item);
                                    setEditInventoryItemName(item.itemName);
                                    setEditInventoryItemNumber(item.itemNumber);
                                    setEditInventoryItemPar(String(item.par));
                                    setEditInventoryItemUnitCost(String(item.unitCost ?? 0));
                                    setInventoryStatus('');
                                  }}
                                  className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAddInventoryItem(item);
                                    setAddInventoryQty('');
                                    setAddInventoryLotNumber('');
                                    setAddInventoryExpirationDate('');
                                    setAddInventoryManufacturer('');
                                    setAddInventoryNotes('');
                                    setInventoryStatus('');
                                  }}
                                  className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRemoveInventoryItem(item);
                                    setRemoveInventoryQty('');
                                    setRemoveInventoryReason('Expired');
                                    setInventoryStatus('');
                                  }}
                                  className="rounded-lg bg-red-700 px-3 py-1 text-xs font-bold text-white hover:bg-red-800"
                                >
                                  Remove
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransferInventoryItem(item);
                                    setTransferInventoryQty('');
                                    setTransferDestinationRoomId('');
                                    setInventoryStatus('');
                                  }}
                                  className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                                >
                                  Transfer
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedInventoryItemId === item.id && (
                            <tr>
                              <td colSpan={9} className="bg-slate-50 px-3 py-3">
                                <div className="rounded-xl border border-slate-200 bg-white p-3">
                                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Lots</div>
                                  {(inventoryLotsByItemId[item.id] ?? []).length === 0 ? (
                                    <div className="text-sm text-slate-500">No active lots found for this item.</div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs">
                                        <thead className="text-left font-bold uppercase tracking-wide text-slate-500">
                                          <tr>
                                            <th className="px-2 py-1">Lot Number</th>
                                            <th className="px-2 py-1">Qty</th>
                                            <th className="px-2 py-1">Expiration</th>
                                            <th className="px-2 py-1">Manufacturer</th>
                                            <th className="px-2 py-1">Notes</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(inventoryLotsByItemId[item.id] ?? []).map((lot) => (
                                            <tr key={lot.id}>
                                              <td className="px-2 py-1 font-semibold text-slate-800">{lot.lotNumber || '—'}</td>
                                              <td className="px-2 py-1 text-slate-700">{lot.qtyOnHand}</td>
                                              <td className="px-2 py-1">
                                                <span className={getInventoryExpirationClass(lot.expirationDate)}>
                                                  {lot.expirationDate || '—'}
                                                </span>
                                              </td>
                                              <td className="px-2 py-1 text-slate-700">{lot.manufacturer || '—'}</td>
                                              <td className="px-2 py-1 text-slate-700">{lot.notes || '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                  </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedEditInventoryItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <div className="text-lg font-bold text-slate-900">Edit Inventory Item</div>
                <div className="text-sm text-slate-500">{selectedEditInventoryItem.itemName}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEditInventoryItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                Item Name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editInventoryItemName}
                  onChange={(event) => setEditInventoryItemName(event.target.value)}
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Item Number / SKU
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editInventoryItemNumber}
                  onChange={(event) => setEditInventoryItemNumber(event.target.value)}
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                PAR
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editInventoryItemPar}
                  onChange={(event) => setEditInventoryItemPar(event.target.value)}
                  inputMode="numeric"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Unit Cost
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={editInventoryItemUnitCost}
                  onChange={(event) => setEditInventoryItemUnitCost(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
              <button
                type="button"
                onClick={handleUpdateInventoryItem}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleDeleteInventoryItem}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
              >
                Delete Item
              </button>
              {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
            </div>
          </div>
        </div>
      )}

      {selectedAddInventoryItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <div className="text-lg font-bold text-slate-900">Add Inventory</div>
                <div className="text-sm text-slate-500">{selectedAddInventoryItem.itemName}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAddInventoryItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Quantity *
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addInventoryQty}
                  onChange={(event) => setAddInventoryQty(event.target.value)}
                  inputMode="numeric"
                  placeholder="1"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Lot Number
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addInventoryLotNumber}
                  onChange={(event) => setAddInventoryLotNumber(event.target.value)}
                  placeholder="17260413A"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Expiration Date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addInventoryExpirationDate}
                  onChange={(event) => setAddInventoryExpirationDate(event.target.value)}
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Manufacturer
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addInventoryManufacturer}
                  onChange={(event) => setAddInventoryManufacturer(event.target.value)}
                  placeholder="Bound Tree"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                Notes
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={addInventoryNotes}
                  onChange={(event) => setAddInventoryNotes(event.target.value)}
                  rows={3}
                  placeholder="Packing slip, invoice, or receiving notes"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
              <button
                type="button"
                onClick={handleAddInventoryQuantity}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
              >
                Save Inventory
              </button>
              {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
            </div>
          </div>
        </div>
      )}

      {selectedRemoveInventoryItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <div className="text-lg font-bold text-slate-900">Remove Inventory</div>
                <div className="text-sm text-slate-500">{selectedRemoveInventoryItem.itemName}</div>
                <div className="text-xs text-slate-500">Qty on hand: {selectedRemoveInventoryItem.qtyOnHand}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRemoveInventoryItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Quantity *
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={removeInventoryQty}
                  onChange={(event) => setRemoveInventoryQty(event.target.value)}
                  inputMode="numeric"
                  placeholder="1"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Reason
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={removeInventoryReason}
                  onChange={(event) => setRemoveInventoryReason(event.target.value)}
                >
                  <option value="Normal Usage">Normal Usage</option>
                  <option value="Expired">Expired</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Shrink">Shrink</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
              <button
                type="button"
                onClick={handleRemoveInventoryQuantity}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
              >
                Save Removal
              </button>
              {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
            </div>
          </div>
        </div>
      )}

      {selectedTransferInventoryItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <div className="text-lg font-bold text-slate-900">Transfer Inventory</div>
                <div className="text-sm text-slate-500">{selectedTransferInventoryItem.itemName}</div>
                <div className="text-xs text-slate-500">Qty on hand: {selectedTransferInventoryItem.qtyOnHand}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransferInventoryItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Quantity *
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={transferInventoryQty}
                  onChange={(event) => setTransferInventoryQty(event.target.value)}
                  inputMode="numeric"
                  placeholder="1"
                />
              </label>

              <label className="text-xs font-semibold text-slate-600">
                Destination Supply Room
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={transferDestinationRoomId}
                  onChange={(event) => setTransferDestinationRoomId(event.target.value)}
                >
                  <option value="">Select destination</option>
                  {inventorySupplyRooms
                    .filter((room) => room.id !== selectedSupplyRoomId)
                    .map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
              <button
                type="button"
                onClick={handleTransferInventoryQuantity}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Save Transfer
              </button>
              {inventoryStatus && <div className="text-sm font-semibold text-slate-700">{inventoryStatus}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(InventoryTrackingTile);
