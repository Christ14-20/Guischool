package com.example.guischool.ui.screens.absences

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.example.guischool.data.model.*
     // Icônes contour
import androidx.compose.material.icons.rounded.*      // Icônes arrondies
import androidx.compose.material.icons.sharp.*        // Icônes nettes
import androidx.compose.material.icons.twotone.*      // Icônes deux tons
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset

/**
 * Absences screen - Modern redesign with visual statistics and improved UX
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbsencesScreen(
    student: Student?,
    absences: List<Absence>,
    onBackClick: () -> Unit,
    onJustifyAbsence: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedFilter by remember { mutableStateOf(AbsenceFilter.ALL) }
    var showJustificationDialog by remember { mutableStateOf(false) }
    var selectedAbsence by remember { mutableStateOf<Absence?>(null) }
    var justificationText by remember { mutableStateOf("") }
    var showAttachmentOptions by remember { mutableStateOf(false) }

    val filteredAbsences = remember(absences, selectedFilter) {
        when (selectedFilter) {
            AbsenceFilter.UNJUSTIFIED -> absences.filter { it.status == AbsenceStatus.ABSENT }
            AbsenceFilter.JUSTIFIED -> absences.filter { it.status == AbsenceStatus.ABSENT_JUSTIFIED }
            AbsenceFilter.LATE -> absences.filter { it.status == AbsenceStatus.LATE }
            else -> absences.sortedByDescending { it.date }
        }
    }

    val stats = remember(absences) { calculateStats(absences) }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "Absences & Retards",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        student?.let {
                            Text(
                                "${it.firstName} ${it.lastName}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.1f)
                        ) {
                            Icon(
                                Icons.Default.ArrowBack,
                                contentDescription = "Retour",
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { /* Export/Share */ }) {
                        Icon(Icons.Default.Share, contentDescription = "Partager")
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        floatingActionButton = {
            if (stats.unjustified > 0) {
                ExtendedFloatingActionButton(
                    onClick = {
                        selectedAbsence = absences.firstOrNull { it.status == AbsenceStatus.ABSENT }
                        showJustificationDialog = true
                    },
                    icon = { Icon(Icons.Default.EditNote, contentDescription = null) },
                    text = { Text("Justifier") },
                    containerColor = MaterialTheme.colorScheme.errorContainer,
                    contentColor = MaterialTheme.colorScheme.onErrorContainer,
                    shape = RoundedCornerShape(16.dp)
                )
            }
        }
    ) { paddingValues ->
        if (student == null) {
            EmptyState(
                icon = Icons.Outlined.PersonOff,
                title = "Aucun élève sélectionné",
                subtitle = "Veuillez sélectionner un élève pour voir ses absences"
            )
            return@Scaffold
        }

        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Visual Statistics Dashboard
            item {
                StatisticsDashboard(stats = stats)
            }

            // Filter Tabs
            item {
                FilterTabs(
                    selectedFilter = selectedFilter,
                    onFilterSelected = { selectedFilter = it },
                    stats = stats
                )
            }

            // Absences List Header
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = when (selectedFilter) {
                            AbsenceFilter.ALL -> "Historique complet"
                            AbsenceFilter.UNJUSTIFIED -> "Absences à justifier"
                            AbsenceFilter.JUSTIFIED -> "Absences justifiées"
                            AbsenceFilter.LATE -> "Retards enregistrés"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${filteredAbsences.size} élément${if (filteredAbsences.size > 1) "s" else ""}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Absences List
            if (filteredAbsences.isEmpty()) {
                item {
                    EmptyFilterState(selectedFilter)
                }
            } else {
                items(
                    items = filteredAbsences,
                    key = { it.id }
                ) { absence ->
                    AbsenceListItem(
                        absence = absence,
                        onJustifyClick = {
                            selectedAbsence = absence
                            showJustificationDialog = true
                        },
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }

            // Info Card
            item {
                JustificationInfoCard(
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }

            // Bottom spacer for FAB
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }

    // Justification Dialog
    if (showJustificationDialog && selectedAbsence != null) {
        JustificationBottomSheet(
            absence = selectedAbsence!!,
            justificationText = justificationText,
            onTextChange = { justificationText = it },
            onAttachClick = { showAttachmentOptions = true },
            onSubmit = {
                onJustifyAbsence(selectedAbsence!!.id, justificationText)
                showJustificationDialog = false
                justificationText = ""
            },
            onDismiss = {
                showJustificationDialog = false
                justificationText = ""
            }
        )
    }
}

@Composable
fun StatisticsDashboard(stats: AbsenceStats) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
    ) {
        // Main circular progress
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Attendance Rate Circle
            AttendanceCircle(
                percentage = stats.attendanceRate,
                label = "Assiduité",
                color = if (stats.attendanceRate >= 90) Color(0xFF059669)
                else if (stats.attendanceRate >= 80) Color(0xFFD97706)
                else Color(0xFFDC2626)
            )

            // Vertical divider
            Divider(
                modifier = Modifier
                    .height(80.dp)
                    .width(1.dp),
                color = MaterialTheme.colorScheme.outlineVariant
            )

            // Stats column
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatRow(
                    icon = Icons.Default.EventBusy,
                    iconColor = MaterialTheme.colorScheme.error,
                    label = "Non justifiées",
                    value = stats.unjustified.toString(),
                    urgent = stats.unjustified > 0
                )
                StatRow(
                    icon = Icons.Default.CheckCircle,
                    iconColor = Color(0xFF059669),
                    label = "Justifiées",
                    value = stats.justified.toString()
                )
                StatRow(
                    icon = Icons.Default.Timer,
                    iconColor = Color(0xFFD97706),
                    label = "Retards",
                    value = "${stats.late} (${stats.totalLateMinutes}min)"
                )
            }
        }

        // Warning banner if needed
        if (stats.unjustified >= 3) {
            Spacer(modifier = Modifier.height(16.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.errorContainer,
                tonalElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Attention",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Text(
                            "${stats.unjustified} absences non justifiées peuvent impacter le bulletin",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AttendanceCircle(
    percentage: Float,
    label: String,
    color: Color
) {
    val animatedProgress by animateFloatAsState(
        targetValue = percentage / 100f,
        animationSpec = tween(1000, easing = FastOutSlowInEasing)
    )

    Box(
        modifier = Modifier.size(120.dp),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(
            progress = 1f,
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.surfaceVariant,
            strokeWidth = 12.dp,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
        CircularProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier.fillMaxSize(),
            color = color,
            strokeWidth = 12.dp,
            strokeCap = StrokeCap.Round,
            gapSize = 0.dp
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${percentage.toInt()}%",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun StatRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    label: String,
    value: String,
    urgent: Boolean = false
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = iconColor.copy(alpha = 0.1f),
            modifier = Modifier.size(36.dp)
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier
                    .padding(8.dp)
                    .size(20.dp),
                tint = iconColor
            )
        }
        Column {
            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (urgent) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun FilterTabs(
    selectedFilter: AbsenceFilter,
    onFilterSelected: (AbsenceFilter) -> Unit,
    stats: AbsenceStats
) {
    val filters = listOf(
        AbsenceFilter.ALL to "Tous",
        AbsenceFilter.UNJUSTIFIED to "À justifier (${stats.unjustified})",
        AbsenceFilter.JUSTIFIED to "Justifiées",
        AbsenceFilter.LATE to "Retards"
    )

    ScrollableTabRow(
        selectedTabIndex = filters.indexOfFirst { it.first == selectedFilter },
        edgePadding = 20.dp,
        containerColor = MaterialTheme.colorScheme.background,
        contentColor = MaterialTheme.colorScheme.primary,
        indicator = { tabPositions ->
            if (selectedFilter.ordinal < tabPositions.size) {
                TabRowDefaults.SecondaryIndicator(
                    modifier = Modifier.tabIndicatorOffset(tabPositions[filters.indexOfFirst { it.first == selectedFilter }]),
                    height = 3.dp,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        },
        divider = {}
    ) {
        filters.forEach { (filter, label) ->
            Tab(
                selected = selectedFilter == filter,
                onClick = { onFilterSelected(filter) },
                text = {
                    Text(
                        label,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = if (selectedFilter == filter) FontWeight.Bold else FontWeight.Normal
                    )
                },
                selectedContentColor = MaterialTheme.colorScheme.primary,
                unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun AbsenceListItem(
    absence: Absence,
    onJustifyClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val statusColor = getAbsenceStatusColor(absence.status)
    val scale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
    )

    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .scale(scale),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = when (absence.status) {
                AbsenceStatus.ABSENT -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
                AbsenceStatus.ABSENT_JUSTIFIED -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                AbsenceStatus.LATE -> MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
                else -> MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Date column
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = statusColor.copy(alpha = 0.15f),
                    modifier = Modifier.width(60.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = absence.date.substring(8, 10), // Day
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                        Text(
                            text = getMonthName(absence.date.substring(5, 7)), // Month
                            style = MaterialTheme.typography.labelMedium,
                            color = statusColor.copy(alpha = 0.8f)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Content
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = statusColor.copy(alpha = 0.1f)
                        ) {
                            Text(
                                text = getAbsenceStatusLabel(absence.status),
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = statusColor,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }

                        if (absence.status == AbsenceStatus.ABSENT) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(8.dp)
                            ) {}
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    absence.subject?.let { subject ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Book,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = subject,
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    absence.minutesLate?.let { minutes ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                Icons.Default.Timer,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "Retard de $minutes minutes",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    absence.justification?.let { justification ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(
                                    Icons.Default.Description,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Text(
                                    text = justification,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 2,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }

            // Action button if unjustified
            if (absence.status == AbsenceStatus.ABSENT) {
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onJustifyClick,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    )
                ) {
                    Icon(Icons.Default.EditNote, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Justifier cette absence", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JustificationBottomSheet(
    absence: Absence,
    justificationText: String,
    onTextChange: (String) -> Unit,
    onAttachClick: () -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
                .padding(bottom = 36.dp)
        ) {
            // Handle bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = MaterialTheme.colorScheme.outlineVariant,
                    modifier = Modifier.size(width = 40.dp, height = 4.dp)
                ) {}
            }

            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.errorContainer,
                    modifier = Modifier.size(56.dp)
                ) {
                    Icon(
                        Icons.Default.EditNote,
                        contentDescription = null,
                        modifier = Modifier.padding(16.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                }
                Column {
                    Text(
                        "Justifier l'absence",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Date: ${absence.date}${absence.subject?.let { " • $it" } ?: ""}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Quick reasons chips
            Text(
                "Motifs rapides",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("Maladie", "Rendez-vous médical", "Raison familiale", "Transport").forEach { reason ->
                    AssistChip(
                        onClick = { onTextChange(reason) },
                        label = { Text(reason) },
                        leadingIcon = {
                            Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Text field
            OutlinedTextField(
                value = justificationText,
                onValueChange = onTextChange,
                label = { Text("Motif détaillé") },
                placeholder = { Text("Décrivez la raison de l'absence...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 120.dp),
                shape = RoundedCornerShape(16.dp),
                minLines = 4,
                maxLines = 6,
                leadingIcon = {
                    Icon(Icons.Default.Edit, contentDescription = null)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Attachment button
            OutlinedButton(
                onClick = onAttachClick,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Attachment, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Joindre un justificatif (certificat, etc.)")
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Annuler")
                }
                Button(
                    onClick = onSubmit,
                    enabled = justificationText.isNotBlank(),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Soumettre")
                }
            }
        }
    }
}

@Composable
fun JustificationInfoCard(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.5f),
        tonalElevation = 2.dp
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        modifier = Modifier.padding(10.dp),
                        tint = MaterialTheme.colorScheme.onSecondary
                    )
                }
                Text(
                    "Comment ça marche ?",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            val steps = listOf(
                Icons.Default.TouchApp to "Sélectionnez une absence non justifiée",
                Icons.Default.Edit to "Renseignez le motif de l'absence",
                Icons.Default.Attachment to "Joignez un certificat si nécessaire",
                Icons.Default.CheckCircle to "Le surveillant validera dans les 48h"
            )

            steps.forEachIndexed { index, (icon, text) ->
                Row(
                    modifier = Modifier.padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.secondary.copy(alpha = 0.2f),
                        modifier = Modifier.size(32.dp)
                    ) {
                        Text(
                            "${index + 1}",
                            modifier = Modifier.wrapContentSize(Alignment.Center),
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                    Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(20.dp))
                    Text(
                        text = text,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyFilterState(filter: AbsenceFilter) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        val (icon, title, subtitle) = when (filter) {
            AbsenceFilter.UNJUSTIFIED -> Triple(
                Icons.Outlined.CheckCircle,
                "Tout est en règle !",
                "Aucune absence à justifier pour le moment"
            )
            AbsenceFilter.JUSTIFIED -> Triple(
                Icons.Outlined.FolderOpen,
                "Aucune justification",
                "Les absences justifiées apparaîtront ici"
            )
            AbsenceFilter.LATE -> Triple(
                Icons.Outlined.Timer,
                "Pas de retard",
                "Votre enfant est ponctuel"
            )
            else -> Triple(
                Icons.Outlined.EventAvailable,
                "Aucune donnée",
                "L'historique des absences est vide"
            )
        }

        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier
                .size(80.dp)
                .background(MaterialTheme.colorScheme.primaryContainer, CircleShape)
                .padding(20.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

// Data classes and helpers
enum class AbsenceFilter { ALL, UNJUSTIFIED, JUSTIFIED, LATE }

data class AbsenceStats(
    val total: Int,
    val unjustified: Int,
    val justified: Int,
    val late: Int,
    val totalLateMinutes: Int,
    val attendanceRate: Float
)

private fun calculateStats(absences: List<Absence>): AbsenceStats {
    val unjustified = absences.count { it.status == AbsenceStatus.ABSENT }
    val justified = absences.count { it.status == AbsenceStatus.ABSENT_JUSTIFIED }
    val late = absences.count { it.status == AbsenceStatus.LATE }
    val totalLateMinutes = absences.filter { it.status == AbsenceStatus.LATE }.sumOf { it.minutesLate ?: 0 }
    val total = unjustified + justified + late
    val attendanceRate = if (total > 0) ((total - unjustified) / total.toFloat() * 100) else 100f

    return AbsenceStats(total, unjustified, justified, late, totalLateMinutes, attendanceRate)
}

private fun getMonthName(month: String): String {
    return when (month) {
        "01" -> "JAN"
        "02" -> "FÉV"
        "03" -> "MAR"
        "04" -> "AVR"
        "05" -> "MAI"
        "06" -> "JUIN"
        "07" -> "JUIL"
        "08" -> "AOÛT"
        "09" -> "SEP"
        "10" -> "OCT"
        "11" -> "NOV"
        "12" -> "DÉC"
        else -> month
    }
}

private fun getAbsenceStatusColor(status: AbsenceStatus): Color {
    return when (status) {
        AbsenceStatus.PRESENT -> Color(0xFF059669)
        AbsenceStatus.ABSENT -> Color(0xFFDC2626)
        AbsenceStatus.ABSENT_JUSTIFIED -> Color(0xFF0891B2)
        AbsenceStatus.LATE -> Color(0xFFD97706)
        AbsenceStatus.EXCLUDED -> Color(0xFF7C3AED)
    }
}

private fun getAbsenceStatusLabel(status: AbsenceStatus): String {
    return when (status) {
        AbsenceStatus.PRESENT -> "Présent"
        AbsenceStatus.ABSENT -> "Non justifiée"
        AbsenceStatus.ABSENT_JUSTIFIED -> "Justifiée"
        AbsenceStatus.LATE -> "Retard"
        AbsenceStatus.EXCLUDED -> "Exclusion"
    }
}

// Extension for FlowRow (simplified version)
@Composable
fun FlowRow(
    modifier: Modifier = Modifier,
    horizontalArrangement: Arrangement.Horizontal = Arrangement.Start,
    verticalArrangement: Arrangement.Vertical = Arrangement.Top,
    content: @Composable () -> Unit
) {
    // Simplified implementation - use androidx.compose.foundation.layout.FlowRow in production
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = horizontalArrangement
    ) {
        content()
    }
}

@Composable
fun EmptyState(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(100.dp),
                tint = MaterialTheme.colorScheme.outline
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}