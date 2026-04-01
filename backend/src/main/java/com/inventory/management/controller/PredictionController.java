package com.inventory.management.controller;

import com.inventory.management.dto.DemandPredictionDTO;
import com.inventory.management.dto.AiDemandPredictionDTO;
import com.inventory.management.service.AiDemandPredictionService;
import com.inventory.management.service.DemandPredictionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
@CrossOrigin(origins = "*")
public class PredictionController {

    @Autowired
    private DemandPredictionService demandPredictionService;

    @Autowired
    private AiDemandPredictionService aiDemandPredictionService;

    @GetMapping("/demand")
    public ResponseEntity<List<DemandPredictionDTO>> getDemandPredictions() {
        return ResponseEntity.ok(demandPredictionService.getDemandPredictions());
    }

    @GetMapping("/ai-demand")
    public ResponseEntity<List<AiDemandPredictionDTO>> getAiDemandPredictions() {
        return ResponseEntity.ok(aiDemandPredictionService.getAiDemandPredictions());
    }
}
