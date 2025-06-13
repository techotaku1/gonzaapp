'use server';

import { revalidatePath } from 'next/cache';

export interface AsesorSelectionResult {
  success: boolean;
}

export async function toggleAsesorSelectionAction(): Promise<AsesorSelectionResult> {
  try {
    // Add small delay to simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));
    void revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error toggling asesor selection:', error);
    return { success: false };
  }
}
