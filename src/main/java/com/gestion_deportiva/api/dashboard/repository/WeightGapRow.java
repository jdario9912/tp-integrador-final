package com.gestion_deportiva.api.dashboard.repository;

import java.time.LocalDate;

// US-11 · Atleta sin peso reciente y la fecha de su último registro (null si nunca registró)
public interface WeightGapRow extends DashboardAthleteRow {

    LocalDate getLastRecordedOn();
}
