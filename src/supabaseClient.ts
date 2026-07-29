import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qbobksomtupwodzijpal.supabase.co'
const supabaseAnonKey = 'sb_publishable_XIZHxQ-5ei97F0WIeukJrw_Dr7w9UQZ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
})

export const searchPerfumes = async (query: string) => {
  if (!query) return [];
  
  console.log('🔍 Backend Fetch: Searching perfumes for:', query);
  
  try {
    const { data, error } = await supabase
      .from('perfumes')
      .select('id, name, stock_ml, cost_price')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('❌ Supabase Error fetching perfumes:', error);
      return [];
    }

    console.log('✅ Data Received from Perfumes Table:', data);
    return data || [];
  } catch (err) {
    console.error('❌ Unexpected Error in searchPerfumes:', err);
    return [];
  }
};

/**
 * Fetch the current stock_ml for a perfume by name (case-insensitive).
 * Returns null if not found or on error.
 */
export const fetchPerfumeStock = async (name: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('perfumes')
      .select('stock_ml')
      .ilike('name', name)
      .maybeSingle();

    if (error || !data) return null;
    return data.stock_ml ?? null;
  } catch {
    return null;
  }
};

/**
 * Deducts stock for all items in an order and marks the order as stock_deducted.
 * Returns an array of any errors encountered per item.
 */
export const deductStock = async (
  orderId: string,
  items: Array<{ perfumeName: string; size?: string; quantity: number; qty?: number; isMix?: boolean; isMakhamria?: boolean; makhamriaId?: string; ingredients?: { perfumeName: string; amountMl: number }[]; bottleName?: string; }>
): Promise<string[]> => {
  const errors: string[] = [];

  // Oil volume per bottle size (in ml)
  const oilPerSize: Record<string, number> = {
    '30ml': 8,
    '50ml': 15,
    '100ml': 30,
  };

  for (const item of items) {
    const itemQuantity = Number(item.qty) || Number(item.quantity) || 1;

    // ── MAKHAMRIA ITEM: deduct stock_qty (units) ──
    if (item.isMakhamria) {
      try {
        console.log(`🌸 Processing Makhamria "${item.perfumeName}" (×${itemQuantity} units)...`);
        let makData = null;
        if (item.makhamriaId) {
          const { data } = await supabase.from('makhamria').select('id, stock_qty').eq('id', item.makhamriaId).maybeSingle();
          makData = data;
        }
        if (!makData) {
          const { data } = await supabase.from('makhamria').select('id, stock_qty').ilike('name', item.perfumeName).maybeSingle();
          makData = data;
        }

        if (!makData) {
          errors.push(`Makhamria "${item.perfumeName}" not found in inventory.`);
        } else {
          const currentStock = makData.stock_qty ?? 0;
          const newStock = Math.max(0, currentStock - itemQuantity);
          const { error: updateErr } = await supabase
            .from('makhamria')
            .update({ stock_qty: newStock })
            .eq('id', makData.id);

          if (updateErr) {
            errors.push(`Failed to update stock for Makhamria "${item.perfumeName}": ${updateErr.message}`);
          } else {
            console.log(`✅ Deducted ${itemQuantity} unit(s) from Makhamria "${item.perfumeName}". New stock: ${newStock}`);
          }
        }
      } catch (err: any) {
        errors.push(`Error processing Makhamria "${item.perfumeName}": ${err.message}`);
      }
    }
    // ── MIX ITEM: deduct each ingredient separately ──
    else if (item.isMix && item.ingredients && item.ingredients.length > 0) {
      console.log(`🧪 Processing mix "${item.perfumeName}" (×${itemQuantity})...`);
      for (const ing of item.ingredients) {
        try {
          const totalUsage = (Number(ing.amountMl) || 0) * itemQuantity;
          if (totalUsage <= 0) continue;

          const { data: perfume, error: fetchErr } = await supabase
            .from('perfumes')
            .select('id, stock_ml')
            .ilike('name', ing.perfumeName)
            .maybeSingle();

          if (fetchErr || !perfume) {
            errors.push(`Ingredient "${ing.perfumeName}" not found in inventory.`);
            continue;
          }

          const currentStock = perfume.stock_ml ?? 0;
          const newStock = Math.max(0, currentStock - totalUsage);

          const { error: updateErr } = await supabase
            .from('perfumes')
            .update({ stock_ml: newStock })
            .eq('id', perfume.id);

          if (updateErr) {
            errors.push(`Failed to update stock for ingredient "${ing.perfumeName}": ${updateErr.message}`);
          } else {
            console.log(`✅ Mix deducted ${totalUsage}ml from ${ing.perfumeName}. New stock: ${newStock}ml`);
          }
        } catch (err: any) {
          errors.push(`Error processing ingredient "${ing.perfumeName}": ${err.message}`);
        }
      }
    } else {
      // ── SINGLE ITEM: use size-based oil calculation ──
      try {
        const size = item.size || '50ml';
        const oilUsagePerBottle = oilPerSize[size] || 15;
        const totalUsage = oilUsagePerBottle * itemQuantity;

        if (totalUsage > 0) {
          const { data: perfume, error: fetchErr } = await supabase
            .from('perfumes')
            .select('id, stock_ml')
            .ilike('name', item.perfumeName)
            .maybeSingle();

          if (fetchErr || !perfume) {
            errors.push(`Perfume "${item.perfumeName}" not found in inventory.`);
          } else {
            const currentStock = perfume.stock_ml ?? 0;
            const newStock = Math.max(0, currentStock - totalUsage);

            const { error: updateErr } = await supabase
              .from('perfumes')
              .update({ stock_ml: newStock })
              .eq('id', perfume.id);

            if (updateErr) {
              errors.push(`Failed to update stock for "${item.perfumeName}": ${updateErr.message}`);
            } else {
              console.log(`✅ Deducted ${totalUsage}ml from ${item.perfumeName} (${size} × ${itemQuantity}). New stock: ${newStock}ml`);
            }
          }
        }
      } catch (err: any) {
        errors.push(`Error processing "${item.perfumeName}": ${err.message}`);
      }
    }
    
    // ── PREMIUM BOX DEDUCTION ──
    if ((item as any).premiumBox) {
      try {
        const { data: box, error: fetchErr } = await supabase
          .from('bottles')
          .select('id, stock_quantity')
          .eq('size', 'علبة')
          .maybeSingle();

        if (fetchErr || !box) {
           errors.push(`Premium Box "علبة" not found in inventory.`);
        } else {
           const newBoxStock = Math.max(0, (box.stock_quantity || 0) - itemQuantity);
           const { error: updateErr } = await supabase.from('bottles').update({ stock_quantity: newBoxStock }).eq('id', box.id);
           if (updateErr) errors.push(`Failed to update box stock: ${updateErr.message}`);
           else console.log(`✅ Deducted ${itemQuantity} Premium Box(es). New stock: ${newBoxStock}`);
        }
      } catch (err: any) {
        errors.push(`Error processing Premium Box: ${err.message}`);
      }
    }

    // ── DEDUCT BOTTLE (MOVED TO ORDER CREATION) ──
    // Bottle deduction is now handled synchronously when the order is logged.
    // This prevents double deduction when moving an order to "Prepared".
  }

  // Mark the order so deduction won't happen again
  await supabase
    .from('orders')
    .update({ stock_deducted: true })
    .eq('id', orderId);

  return errors;
};

/**
 * Restores stock for all items in an order and marks the order as not stock_deducted.
 * Used for undoing a "Prepared" or "Sold" status back to "Pending".
 */
export const restoreStock = async (
  orderId: string,
  items: Array<{ perfumeName: string; size?: string; quantity: number; qty?: number; isMix?: boolean; isMakhamria?: boolean; makhamriaId?: string; ingredients?: { perfumeName: string; amountMl: number }[]; bottleName?: string; }>
): Promise<string[]> => {
  const errors: string[] = [];

  // Oil volume per bottle size (in ml)
  const oilPerSize: Record<string, number> = {
    '30ml': 8,
    '50ml': 15,
    '100ml': 30,
  };

  for (const item of items) {
    const itemQuantity = Number(item.qty) || Number(item.quantity) || 1;

    // ── MAKHAMRIA ITEM: restore stock_qty (units) ──
    if (item.isMakhamria) {
      try {
        console.log(`🌸 Restoring Makhamria "${item.perfumeName}" (×${itemQuantity} units)...`);
        let makData = null;
        if (item.makhamriaId) {
          const { data } = await supabase.from('makhamria').select('id, stock_qty').eq('id', item.makhamriaId).maybeSingle();
          makData = data;
        }
        if (!makData) {
          const { data } = await supabase.from('makhamria').select('id, stock_qty').ilike('name', item.perfumeName).maybeSingle();
          makData = data;
        }

        if (!makData) {
          errors.push(`Makhamria "${item.perfumeName}" not found in inventory.`);
        } else {
          const currentStock = makData.stock_qty ?? 0;
          const newStock = currentStock + itemQuantity;
          const { error: updateErr } = await supabase
            .from('makhamria')
            .update({ stock_qty: newStock })
            .eq('id', makData.id);

          if (updateErr) {
            errors.push(`Failed to update stock for Makhamria "${item.perfumeName}": ${updateErr.message}`);
          } else {
            console.log(`✅ Restored ${itemQuantity} unit(s) to Makhamria "${item.perfumeName}". New stock: ${newStock}`);
          }
        }
      } catch (err: any) {
        errors.push(`Error processing Makhamria "${item.perfumeName}": ${err.message}`);
      }
    }
    // ── MIX ITEM: restore each ingredient separately ──
    else if (item.isMix && item.ingredients && item.ingredients.length > 0) {
      console.log(`🧪 Restoring mix "${item.perfumeName}" (×${itemQuantity})...`);
      for (const ing of item.ingredients) {
        try {
          const totalUsage = (Number(ing.amountMl) || 0) * itemQuantity;
          if (totalUsage <= 0) continue;

          const { data: perfume, error: fetchErr } = await supabase
            .from('perfumes')
            .select('id, stock_ml')
            .ilike('name', ing.perfumeName)
            .maybeSingle();

          if (fetchErr || !perfume) {
            errors.push(`Ingredient "${ing.perfumeName}" not found in inventory.`);
            continue;
          }

          const currentStock = perfume.stock_ml ?? 0;
          const newStock = currentStock + totalUsage;

          const { error: updateErr } = await supabase
            .from('perfumes')
            .update({ stock_ml: newStock })
            .eq('id', perfume.id);

          if (updateErr) {
            errors.push(`Failed to update stock for ingredient "${ing.perfumeName}": ${updateErr.message}`);
          } else {
            console.log(`✅ Mix restored ${totalUsage}ml to ${ing.perfumeName}. New stock: ${newStock}ml`);
          }
        } catch (err: any) {
          errors.push(`Error processing ingredient "${ing.perfumeName}": ${err.message}`);
        }
      }
    } else {
      // ── SINGLE ITEM: use size-based oil calculation ──
      try {
        const size = item.size || '50ml';
        const oilUsagePerBottle = oilPerSize[size] || 15;
        const totalUsage = oilUsagePerBottle * itemQuantity;

        if (totalUsage > 0) {
          const { data: perfume, error: fetchErr } = await supabase
            .from('perfumes')
            .select('id, stock_ml')
            .ilike('name', item.perfumeName)
            .maybeSingle();

          if (fetchErr || !perfume) {
            errors.push(`Perfume "${item.perfumeName}" not found in inventory.`);
          } else {
            const currentStock = perfume.stock_ml ?? 0;
            const newStock = currentStock + totalUsage;

            const { error: updateErr } = await supabase
              .from('perfumes')
              .update({ stock_ml: newStock })
              .eq('id', perfume.id);

            if (updateErr) {
              errors.push(`Failed to update stock for "${item.perfumeName}": ${updateErr.message}`);
            } else {
              console.log(`✅ Restored ${totalUsage}ml to ${item.perfumeName} (${size} × ${itemQuantity}). New stock: ${newStock}ml`);
            }
          }
        }
      } catch (err: any) {
        errors.push(`Error processing "${item.perfumeName}": ${err.message}`);
      }
    }
    
    // ── PREMIUM BOX RESTORATION ──
    if ((item as any).premiumBox) {
      try {
        const { data: box, error: fetchErr } = await supabase
          .from('bottles')
          .select('id, stock_quantity')
          .eq('size', 'علبة')
          .maybeSingle();

        if (fetchErr || !box) {
           errors.push(`Premium Box "علبة" not found in inventory.`);
        } else {
           const newBoxStock = (box.stock_quantity || 0) + itemQuantity;
           const { error: updateErr } = await supabase.from('bottles').update({ stock_quantity: newBoxStock }).eq('id', box.id);
           if (updateErr) errors.push(`Failed to update box stock: ${updateErr.message}`);
           else console.log(`✅ Restored ${itemQuantity} Premium Box(es). New stock: ${newBoxStock}`);
        }
      } catch (err: any) {
        errors.push(`Error processing Premium Box: ${err.message}`);
      }
    }

    // ── RESTORE BOTTLE (DISABLED) ──
    // Bottle stock is now managed entirely at order creation/deletion.
    // If you need to restore bottles when an order moves back to Pending, 
    // it's considered outside the scope since deduction happens immediately on log.
  }

  // Mark the order so deduction can happen again later if needed
  await supabase
    .from('orders')
    .update({ stock_deducted: false })
    .eq('id', orderId);

  return errors;
};

export const addProduct = async (name: string, basePrice: number) => {
  console.log('🚀 Supabase: Adding product...', { name, basePrice });
  try {
    const { data, error } = await supabase
      .from('perfumes')
      .insert([{ name, base_price: basePrice }])
      .select();

    if (error) {
      console.error('❌ Supabase Error adding product:', error);
      throw error;
    }

    console.log('✅ Product Added successfully:', data);
    return data;
  } catch (err) {
    console.error('❌ ERROR in addProduct:', err);
    throw err;
  }
};

// ── MAKHAMRIA API HELPERS ───────────────────────────────────────────────────

export const searchMakhamria = async (query: string) => {
  if (!query) return [];
  try {
    const { data, error } = await supabase
      .from('makhamria')
      .select('id, name, cost_price, selling_price, stock_qty')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('❌ Error searching makhamria:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('❌ Unexpected error in searchMakhamria:', err);
    return [];
  }
};

export const fetchMakhamriaStock = async (name: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('makhamria')
      .select('stock_qty')
      .ilike('name', name)
      .maybeSingle();

    if (error || !data) return null;
    return data.stock_qty ?? null;
  } catch {
    return null;
  }
};

export const fetchMakhamriaItems = async () => {
  try {
    const { data, error } = await supabase
      .from('makhamria')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch makhamria items:', err);
    return [];
  }
};

export const addMakhamriaItem = async (name: string, costPrice?: number, sellingPrice?: number, stockQty?: number) => {
  try {
    const { data, error } = await supabase
      .from('makhamria')
      .insert([{
        name,
        cost_price: costPrice ?? null,
        selling_price: sellingPrice ?? null,
        stock_qty: stockQty ?? 0
      }])
      .select();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error in addMakhamriaItem:', err);
    throw err;
  }
};

export const updateMakhamriaItem = async (id: string, updates: { name?: string; cost_price?: number | null; selling_price?: number | null; stock_qty?: number | null }) => {
  try {
    const { data, error } = await supabase
      .from('makhamria')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error in updateMakhamriaItem:', err);
    throw err;
  }
};

export const deleteMakhamriaItem = async (id: string) => {
  try {
    const { error } = await supabase
      .from('makhamria')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error in deleteMakhamriaItem:', err);
    throw err;
  }
};

