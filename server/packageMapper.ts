// Helper function to map database rows to Package objects
export function mapRowToPackage(row: any) {
  return {
    id: row.id,
    packageId: row.package_id,
    barcode: row.barcode,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    recipientAddress: row.recipient_address,
    priority: row.priority,
    status: row.status,
    assignedKurirId: row.assigned_kurir_id,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    deliveredAt: row.delivered_at,
    deliveryProof: row.delivery_proof,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    weight: row.weight || null,
    dimensions: row.dimensions || null,
    value: row.value || null,
    senderName: row.sender_name || null,
    senderPhone: row.sender_phone || null,
    pickupAddress: row.pickup_address || null,
    resi: row.resi || null
  };
}