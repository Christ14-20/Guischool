package com.example.guischool.ui.screens.grades

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.guischool.data.model.*

/**
 * Grades screen avec design moderne type carte scolaire digitale
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradesScreen(
    student: Student?,
    grades: List<Subject>,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,

) {
    var selectedPeriod by remember { mutableStateOf(Period.TRIMESTRE_2) }
    var selectedSubject by remember { mutableStateOf<Subject?>(null) }

    val overallAverage = remember(grades) { calculateOverallAverage(grades) }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Text(
                        "Carnet de Notes",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Retour",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        }
    ) { paddingValues ->
        if (student == null) {
            EmptyGradesState()
            return@Scaffold
        }

        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.surface,
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                        )
                    )
                )
                .padding(paddingValues),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Header avec moyenne générale circulaire
            item {
                ModernGradeHeader(
                    student = student,
                    average = overallAverage,
                    totalSubjects = grades.size
                )
            }

            // Sélecteur de période horizontal
            item {
                PeriodSelectorChips(
                    selectedPeriod = selectedPeriod,
                    onPeriodSelected = { selectedPeriod = it }
                )
            }

            // Résumé rapide
            item {
                GradeStatsRow(grades = grades, selectedPeriod = selectedPeriod)
            }

            // Liste des matières
            items(grades.sortedByDescending { it.average }) { subject ->
                SubjectGradeCardModern(
                    subject = subject,
                    period = selectedPeriod,
                    rank = grades.sortedByDescending { it.average }.indexOf(subject) + 1,
                    onClick = { selectedSubject = subject }
                )
            }

            // Espace pour le bas
            item { Spacer(modifier = Modifier.height(32.dp)) }
        }

        // Bottom sheet pour les détails d'une matière
        if (selectedSubject != null) {
            SubjectDetailBottomSheet(
                subject = selectedSubject!!,
                period = selectedPeriod,
                onDismiss = { selectedSubject = null }
            )
        }
    }
}

@Composable
private fun ModernGradeHeader(
    student: Student,
    average: Double,
    totalSubjects: Int,
    grades: List<Subject> = emptyList()

) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(24.dp)),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar et nom
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .shadow(4.dp, CircleShape)
                            .background(MaterialTheme.colorScheme.primary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${student.firstName.first()}${student.lastName.first()}",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column {
                        Text(
                            text = "${student.firstName} ${student.lastName}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = student.className,
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Cercle de moyenne générale
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Moyenne circulaire
                CircularAverageIndicator(
                    average = average,
                    size = 120.dp,
                    strokeWidth = 12.dp
                )

                // Stats rapides
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    StatItem(
                        icon = Icons.Rounded.MenuBook,
                        value = "$totalSubjects",
                        label = "Matières"
                    )
                    StatItem(
                        icon = Icons.Rounded.TrendingUp,
                        value = "${grades.count { it.average >= 10 }}",
                        label = "Validées"
                    )
                    StatItem(
                        icon = Icons.Rounded.EmojiEvents,
                        value = "${grades.maxByOrNull { it.average }?.name?.take(3) ?: "-"}",
                        label = "Meilleure"
                    )
                }
            }
        }
    }
}

@Composable
private fun CircularAverageIndicator(
    average: Double,
    size: androidx.compose.ui.unit.Dp,
    strokeWidth: androidx.compose.ui.unit.Dp
) {
    val color = getGradeColor(average)
    val percentage = (average / 20f).coerceIn(0.0, 1.0)

    Box(
        modifier = Modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        // Cercle de fond
        CircularProgressIndicator(
            progress = 1f,
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.3f),
            strokeWidth = strokeWidth,
            trackColor = Color.Transparent
        )

        // Cercle de progression
        CircularProgressIndicator(
            progress = { percentage.toFloat() },
            modifier = Modifier.fillMaxSize(),
            color = color,
            strokeWidth = strokeWidth,
            trackColor = Color.Transparent,
            gapSize = 0.dp
        )

        // Valeur centrale
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = String.format("%.1f", average),
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 36.sp
                ),
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                text = "/20",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
private fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column {
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                ),
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
            )
        }
    }
}

enum class Period(val label: String) {
    TRIMESTRE_1("Trimestre 1"),
    TRIMESTRE_2("Trimestre 2"),
    TRIMESTRE_3("Trimestre 3"),
    ANNEE("Année")
}

@Composable
private fun PeriodSelectorChips(
    selectedPeriod: Period,
    onPeriodSelected: (Period) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Period.entries.forEach { period ->
            FilterChip(
                selected = selectedPeriod == period,
                onClick = { onPeriodSelected(period) },
                label = { Text(period.label) },
                leadingIcon = if (selectedPeriod == period) {
                    {
                        Icon(
                            imageVector = Icons.Rounded.Check,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                } else null,
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                    selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimary
                ),
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun GradeStatsRow(
    grades: List<Subject>,
    selectedPeriod: Period
) {
    val filteredGrades = grades.filter { subject ->
        subject.grades.any { it.period == selectedPeriod.label || selectedPeriod == Period.ANNEE }
    }

    val avg = if (filteredGrades.isNotEmpty()) {
        filteredGrades.sumOf { it.average * it.coefficient } / filteredGrades.sumOf { it.coefficient }
    } else 0.0

    val bestSubject = filteredGrades.maxByOrNull { it.average }
    val worstSubject = filteredGrades.minByOrNull { it.average }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatCard(
            title = "Moy. Période",
            value = String.format("%.1f", avg),
            color = getGradeColor(avg),
            modifier = Modifier.weight(1f)
        )
        StatCard(
            title = "Meilleure",
            value = bestSubject?.name?.take(10) ?: "-",
            subvalue = bestSubject?.let { String.format("%.1f", it.average) } ?: "",
            color = Color(0xFF10B981),
            modifier = Modifier.weight(1f)
        )
        StatCard(
            title = "À améliorer",
            value = worstSubject?.name?.take(10) ?: "-",
            subvalue = worstSubject?.let { String.format("%.1f", it.average) } ?: "",
            color = if ((worstSubject?.average ?: 20.0) < 10) Color(0xFFEF4444) else Color(0xFFF59E0B),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun StatCard(
    title: String,
    value: String,
    subvalue: String = "",
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = color
                ),
                maxLines = 1
            )
            if (subvalue.isNotEmpty()) {
                Text(
                    text = subvalue,
                    style = MaterialTheme.typography.bodySmall,
                    color = color.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
private fun SubjectGradeCardModern(
    subject: Subject,
    period: Period,
    rank: Int,
    onClick: () -> Unit
) {
    val filteredGrades = remember(subject, period) {
        subject.grades.filter { it.period == period.label || period == Period.ANNEE }
    }

    val cardColor = when {
        subject.average >= 16 -> Color(0xFF10B981).copy(alpha = 0.1f)
        subject.average >= 14 -> Color(0xFF3B82F6).copy(alpha = 0.1f)
        subject.average >= 12 -> Color(0xFFF59E0B).copy(alpha = 0.1f)
        subject.average >= 10 -> Color(0xFFF97316).copy(alpha = 0.1f)
        else -> Color(0xFFEF4444).copy(alpha = 0.1f)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    // Classement
                    Surface(
                        shape = CircleShape,
                        color = cardColor,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = "$rank",
                                style = MaterialTheme.typography.labelMedium.copy(
                                    fontWeight = FontWeight.Bold
                                ),
                                color = getGradeColor(subject.average)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = subject.name,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold
                            ),
                            maxLines = 1
                        )
                        Text(
                            text = "Coef. ${subject.coefficient} • ${filteredGrades.size} note${if (filteredGrades.size > 1) "s" else ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Moyenne avec fond coloré
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = cardColor
                ) {
                    Text(
                        text = String.format("%.1f", subject.average),
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = getGradeColor(subject.average)
                        ),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }

            // Mini barre de progression visuelle
            Spacer(modifier = Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { (subject.average / 20f).toFloat() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = getGradeColor(subject.average),
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            // Aperçu des dernières notes
            if (filteredGrades.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    filteredGrades.take(4).forEach { grade ->
                        GradeChip(grade = grade)
                    }
                    if (filteredGrades.size > 4) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "+${filteredGrades.size - 4}",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GradeChip(grade: Grade) {
    val color = getGradeColor(grade.value)

    Surface(
        shape = RoundedCornerShape(8.dp),
        color = color.copy(alpha = 0.15f),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = color.copy(alpha = 0.3f)
        )
    ) {
        Text(
            text = "${grade.value.toInt()}",
            style = MaterialTheme.typography.labelMedium.copy(
                fontWeight = FontWeight.SemiBold,
                color = color
            ),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SubjectDetailBottomSheet(
    subject: Subject,
    period: Period,
    onDismiss: () -> Unit
) {
    val filteredGrades = subject.grades.filter {
        it.period == period.label || period == Period.ANNEE
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = subject.name,
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Text(
                        text = "Coefficient ${subject.coefficient}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = getGradeColor(subject.average).copy(alpha = 0.15f)
                ) {
                    Text(
                        text = String.format("%.1f/20", subject.average),
                        style = MaterialTheme.typography.headlineMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = getGradeColor(subject.average)
                        ),
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Liste détaillée des notes
            Text(
                text = "Détail des évaluations",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold
                ),
                modifier = Modifier.padding(bottom = 12.dp)
            )

            filteredGrades.forEach { grade ->
                DetailedGradeRow(grade = grade)
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (filteredGrades.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Aucune note pour cette période",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun DetailedGradeRow(grade: Grade) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = CircleShape,
                    color = getGradeColor(grade.value).copy(alpha = 0.15f),
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = getGradeTypeIcon(grade.type),
                        contentDescription = null,
                        tint = getGradeColor(grade.value),
                        modifier = Modifier.padding(8.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = getGradeTypeLabel(grade.type),
                        style = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.Medium
                        )
                    )
                    Text(
                        text = grade.date,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${grade.value.toInt()}/${grade.maxValue.toInt()}",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = getGradeColor(grade.value)
                    )
                )
                if (grade.comment != null) {
                    Icon(
                        imageVector = Icons.Rounded.Comment,
                        contentDescription = "Commentaire",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyGradesState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Rounded.School,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = MaterialTheme.colorScheme.surfaceVariant
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Aucun élève sélectionné",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// Helper functions
private fun calculateOverallAverage(grades: List<Subject>): Double {
    if (grades.isEmpty()) return 0.0
    var totalWeightedScore = 0.0
    var totalCoefficients = 0
    for (subject in grades) {
        if (subject.grades.isNotEmpty()) {
            totalWeightedScore += subject.average * subject.coefficient
            totalCoefficients += subject.coefficient
        }
    }
    return if (totalCoefficients > 0) totalWeightedScore / totalCoefficients else 0.0
}

private fun getGradeColor(grade: Double): Color {
    return when {
        grade >= 16 -> Color(0xFF10B981) // Emerald
        grade >= 14 -> Color(0xFF3B82F6) // Blue
        grade >= 12 -> Color(0xFFF59E0B) // Amber
        grade >= 10 -> Color(0xFFF97316) // Orange
        else -> Color(0xFFEF4444) // Red
    }
}

private fun getGradeTypeIcon(type: GradeType) = when (type) {
    GradeType.CC -> Icons.Rounded.EditNote
    GradeType.DS -> Icons.Rounded.Assignment
    GradeType.TP -> Icons.Rounded.Science
    GradeType.PARTICIPATION -> Icons.Rounded.Groups
    GradeType.ORAL -> Icons.Rounded.RecordVoiceOver
}

private fun getGradeTypeLabel(type: GradeType) = when (type) {
    GradeType.CC -> "Contrôle Continu"
    GradeType.DS -> "Devoir Surveillé"
    GradeType.TP -> "Travaux Pratiques"
    GradeType.PARTICIPATION -> "Participation"
    GradeType.ORAL -> "Examen Oral"
}