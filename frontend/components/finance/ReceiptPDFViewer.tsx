"use client";

import React from "react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import ReceiptPDF from "./ReceiptPDF";
import { PaymentItem } from "@/lib/api/finance";

interface ReceiptPDFViewerProps {
  payment: PaymentItem;
}

export default function ReceiptPDFViewer({ payment }: ReceiptPDFViewerProps) {
  const fileName = `Recu_${payment.receipt_number || payment.id}.pdf`;

  return (
    <div className="flex flex-col space-y-4 w-full h-full">
      <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
        <span className="text-sm text-muted-foreground ml-2">
          Prévisualisation du reçu
        </span>
        <PDFDownloadLink
          document={<ReceiptPDF payment={payment} />}
          fileName={fileName}
        >
          {({ loading }) => (
            <Button size="sm" variant="default" disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              {loading ? "Génération..." : "Télécharger"}
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      <div className="flex-1 w-full h-[500px] border rounded-md overflow-hidden bg-white">
        <PDFViewer width="100%" height="100%" className="border-none">
          <ReceiptPDF payment={payment} />
        </PDFViewer>
      </div>
    </div>
  );
}
