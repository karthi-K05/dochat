package com.example.dochat.document.service;

import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class OcrService {

    @Value("${app.ocr.tesseract-data-path:C:/Program Files/Tesseract-OCR/tessdata}")
    private String tessDataPath;

    @Value("${app.ocr.language:eng}")
    private String language;

    /**
     * Extract text from a scanned PDF using OCR.
     * Converts each page to an image, then runs Tesseract on it.
     */
    public List<String> extractTextFromScannedPdf(InputStream pdfStream) throws IOException {
        List<String> pageTexts = new ArrayList<>();

        Tesseract tesseract = new Tesseract();
        tesseract.setDatapath(tessDataPath);
        tesseract.setLanguage(language);
        tesseract.setPageSegMode(1);
        tesseract.setOcrEngineMode(1);

        byte[] pdfBytes = pdfStream.readAllBytes();
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(document);
            int pageCount = document.getNumberOfPages();

            log.info("Running OCR on {} pages", pageCount);

            for (int i = 0; i < pageCount; i++) {
                // Render page as image at 300 DPI for good OCR quality
                BufferedImage image = renderer.renderImageWithDPI(i, 300);

                try {
                    String text = tesseract.doOCR(image);
                    if (text != null && !text.isBlank()) {
                        pageTexts.add(text.trim());
                        log.info("OCR page {}/{}: extracted {} chars", i + 1, pageCount, text.length());
                    } else {
                        log.warn("OCR page {}/{}: no text extracted", i + 1, pageCount);
                    }
                } catch (TesseractException e) {
                    log.error("OCR failed on page {}: {}", i + 1, e.getMessage());
                    pageTexts.add("");
                }
            }
        }

        return pageTexts;
    }

    /**
     * Check if a PDF is likely scanned (image-based) by checking text content.
     * If normal extraction gives very little text, it's probably scanned.
     */
    public boolean isScannedPdf(List<org.springframework.ai.document.Document> extractedDocs) {
        long totalChars = extractedDocs.stream()
                .filter(d -> d.getText() != null)
                .mapToLong(d -> d.getText().length())
                .sum();

        // If less than 100 chars per page on average, likely scanned
        boolean isScanned = extractedDocs.isEmpty() || (totalChars / Math.max(extractedDocs.size(), 1)) < 100;
        log.info("PDF scan detection: totalChars={}, avgPerPage={}, isScanned={}",
                totalChars, totalChars / Math.max(extractedDocs.size(), 1), isScanned);
        return isScanned;
    }
}
