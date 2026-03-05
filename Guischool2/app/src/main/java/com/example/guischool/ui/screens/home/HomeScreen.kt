package com.example.guischool.ui.screens.home

import androidx.compose.animation.*
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties

import com.example.guischool.data.model.*
import kotlin.math.roundToInt

/**
 * Home screen avec Bottom Navigation moderne type application mobile
 * et notifications intégrées dans le menu utilisateur
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    children: List<Student>,
    selectedChild: Student?,
    grades: List<Subject>,
    absences: List<Absence>,
    fees: List<Fee>,
    notifications: List<Notification>,
    onSelectChild: (String) -> Unit,
    onNavigateToGrades: () -> Unit,
    onNavigateToAbsences: () -> Unit,
    onNavigateToPayments: () -> Unit,
    onNavigateToMessages: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showChildSelector by remember { mutableStateOf(false) }
    var selectedNavItem by remember { mutableStateOf(NavItem.HOME) }

    // Dégradé de fond subtil
    val backgroundBrush = Brush.verticalGradient(
        colors = listOf(
            MaterialTheme.colorScheme.surface,
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
            MaterialTheme.colorScheme.surface
        )
    )

    Scaffold(
        bottomBar = {
            ModernBottomNavigation(
                selectedItem = selectedNavItem,
                onItemSelected = { item ->
                    selectedNavItem = item
                    when (item) {
                        NavItem.HOME -> { /* Déjà sur Home */ }
                        NavItem.GRADES -> onNavigateToGrades()
                        NavItem.ABSENCES -> onNavigateToAbsences()
                        NavItem.PAYMENTS -> onNavigateToPayments()
                        NavItem.MESSAGES -> onNavigateToMessages()
                    }
                }
            )
        },
        containerColor = Color.Transparent
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(backgroundBrush)
                .padding(paddingValues)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                // Header moderne avec profil et notifications intégrées
                item {
                    ModernHeaderWithNotifications(
                        children = children,
                        selectedChild = selectedChild,
                        onSelectChild = onSelectChild,
                        showSelector = showChildSelector,
                        onToggleSelector = { showChildSelector = !showChildSelector },
                        onSettingsClick = onNavigateToSettings,
                        notifications = notifications,
                        absences = absences,
                        fees = fees,
                        onViewAllNotifications = { /* TODO */ }
                    )
                }

                if (selectedChild != null) {
                    // Carte de profil élargie avec métriques
                    item {
                        ModernChildProfileCard(
                            student = selectedChild,
                            average = calculateAverage(grades),
                            absencesCount = absences.count {
                                it.status == AbsenceStatus.ABSENT || it.status == AbsenceStatus.ABSENT_JUSTIFIED
                            },
                            totalDue = fees.filter { !it.isPaid }.sumOf { it.remainingAmount }
                        )
                    }

                    // Rappel de paiement flottant
                    val pendingFees = fees.filter {
                        it.status == FeeStatus.PENDING || it.status == FeeStatus.OVERDUE
                    }
                    if (pendingFees.isNotEmpty()) {
                        item {
                            ModernPaymentBanner(
                                totalDue = pendingFees.sumOf { it.remainingAmount },
                                onPayClick = onNavigateToPayments
                            )
                        }
                    }

                    // Section résumé rapide (optionnel - remplace les alertes déplacées)
                    item {
                        QuickStatsSection(
                            notifications = notifications,
                            absences = absences,
                            fees = fees
                        )
                    }

                    // Espacement supplémentaire pour le bottom nav
                    item {
                        Spacer(modifier = Modifier.height(80.dp))
                    }
                } else {
                    // État vide élégant
                    item {
                        EmptyStateModern(
                            onAddChild = { /* TODO */ }
                        )
                    }
                }
            }
        }
    }
}

// Enum pour les items de navigation
enum class NavItem {
    HOME, GRADES, ABSENCES, PAYMENTS, MESSAGES
}

/**
 * Header moderne avec avatar utilisateur et icône de notification à côté
 */
@Composable
private fun ModernHeaderWithNotifications(
    children: List<Student>,
    selectedChild: Student?,
    onSelectChild: (String) -> Unit,
    showSelector: Boolean,
    onToggleSelector: () -> Unit,
    onSettingsClick: () -> Unit,
    notifications: List<Notification>,
    absences: List<Absence>,
    fees: List<Fee>,
    onViewAllNotifications: () -> Unit
) {
    var showNotificationMenu by remember { mutableStateOf(false) }

    // Calcul du nombre total de notifications non lues
    val unreadCount = notifications.count { !it.isRead } +
            absences.count { it.status == AbsenceStatus.ABSENT } +
            fees.count { it.status == FeeStatus.OVERDUE }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f),
                        MaterialTheme.colorScheme.surface
                    )
                )
            )
            .padding(horizontal = 24.dp)
            .padding(top = 48.dp, bottom = 24.dp)
    ) {
        // Ligne supérieure avec titre et les deux icônes (notification + user)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Bonjour,",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Parent",
                    style = MaterialTheme.typography.headlineMedium.copy(
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.5).sp
                    ),
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // Les deux icônes côte à côte : Notification puis User
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Icône de notification avec badge
                Box {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .shadow(8.dp, CircleShape)
                            .background(MaterialTheme.colorScheme.surface, CircleShape)
                            .clickable { showNotificationMenu = !showNotificationMenu },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Notifications,
                            contentDescription = "Notifications",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )

                        // Badge de notification
                        if (unreadCount > 0) {
                            Badge(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = (-4).dp, y = 4.dp),
                                containerColor = MaterialTheme.colorScheme.error
                            ) {
                                Text(
                                    text = if (unreadCount > 9) "9+" else unreadCount.toString(),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onError
                                )
                            }
                        }
                    }

                    // Menu déroulant des notifications
                    NotificationDropdownMenu(
                        expanded = showNotificationMenu,
                        onDismissRequest = { showNotificationMenu = false },
                        notifications = notifications,
                        absences = absences,
                        fees = fees,
                        onViewAll = onViewAllNotifications,
                        onSettingsClick = {
                            showNotificationMenu = false
                            onSettingsClick()
                        }
                    )
                }

                // Icône utilisateur (profil)
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .shadow(8.dp, CircleShape)
                        .background(MaterialTheme.colorScheme.surface, CircleShape)
                        .clickable { onSettingsClick() },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Person,
                        contentDescription = "Profil",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )

                    // Indicateur en ligne
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .align(Alignment.BottomEnd)
                            .offset(x = (-2).dp, y = (-2).dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                            .border(2.dp, MaterialTheme.colorScheme.surface, CircleShape)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Sélecteur d'enfants moderne
        if (children.isNotEmpty()) {
            Text(
                text = "Mes enfants",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(children) { child ->
                    ModernChildChip(
                        student = child,
                        isSelected = child.id == selectedChild?.id,
                        onClick = { onSelectChild(child.id) }
                    )
                }
            }
        }
    }
}

/**
 * Menu déroulant des notifications
 */
@Composable
private fun NotificationDropdownMenu(
    expanded: Boolean,
    onDismissRequest: () -> Unit,
    notifications: List<Notification>,
    absences: List<Absence>,
    fees: List<Fee>,
    onViewAll: () -> Unit,
    onSettingsClick: () -> Unit
) {
    AnimatedVisibility(
        visible = expanded,
        enter = fadeIn() + expandVertically(expandFrom = Alignment.Top),
        exit = fadeOut() + shrinkVertically(shrinkTowards = Alignment.Top)
    ) {
        Popup(
            alignment = Alignment.TopEnd,
            onDismissRequest = onDismissRequest,
            properties = PopupProperties(focusable = true)
        ) {
            Card(
                modifier = Modifier
                    .width(360.dp)
                    .padding(top = 60.dp, end = 80.dp) // Décalé pour être sous l'icône notification
                    .shadow(8.dp, RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    // En-tête du menu
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Notifications",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "${notifications.count { !it.isRead }} non lues",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        IconButton(onClick = onDismissRequest) {
                            Icon(
                                imageVector = Icons.Rounded.Close,
                                contentDescription = "Fermer",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Divider(
                        modifier = Modifier.padding(vertical = 12.dp),
                        color = MaterialTheme.colorScheme.outlineVariant
                    )

                    // Liste des notifications
                    val allAlerts: List<AlertData> = buildList {
                        addAll(notifications.filter { !it.isRead }.map {
                            AlertData(
                                icon = when (it.type) {
                                    NotificationType.GRADE -> Icons.Rounded.Grade
                                    NotificationType.ABSENCE -> Icons.Rounded.EventBusy
                                    NotificationType.PAYMENT -> Icons.Rounded.Payment
                                    NotificationType.MESSAGE -> Icons.Rounded.Message
                                    else -> Icons.Rounded.Info
                                },
                                title = it.title,
                                content = it.content,
                                timestamp = it.timestamp,
                                type = when (it.type) {
                                    NotificationType.GRADE -> AlertType.INFO
                                    NotificationType.ABSENCE -> AlertType.WARNING
                                    NotificationType.PAYMENT -> AlertType.ERROR
                                    else -> AlertType.INFO
                                },
                                isNew = true
                            )
                        })
                        addAll(absences.filter { it.status == AbsenceStatus.ABSENT }.map {
                            AlertData(
                                icon = Icons.Rounded.EventBusy,
                                title = "Nouvelle absence",
                                content = "Le ${it.date}",
                                timestamp = it.date,
                                type = AlertType.WARNING,
                                isNew = true
                            )
                        })
                        addAll(fees.filter { it.status == FeeStatus.OVERDUE }.map {
                            AlertData(
                                icon = Icons.Rounded.Payment,
                                title = "Paiement requis",
                                content = "${it.name}: ${formatCurrency(it.remainingAmount)}",
                                timestamp = "Maintenant",
                                type = AlertType.ERROR,
                                isNew = true
                            )
                        })
                    }.take(5) // Limiter à 5 éléments

                    if (allAlerts.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.NotificationsNone,
                                    contentDescription = null,
                                    modifier = Modifier.size(48.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Aucune notification",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    } else {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            allAlerts.forEach { alert ->
                                NotificationMenuItem(alert = alert)
                            }
                        }
                    }

                    // Bouton voir tout
                    if (allAlerts.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        TextButton(
                            onClick = onViewAll,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Voir toutes les notifications")
                        }
                    }
                }
            }
        }
    }
}

data class AlertData(
    val icon: ImageVector,
    val title: String,
    val content: String,
    val timestamp: String,
    val type: AlertType,
    val isNew: Boolean
)

enum class AlertType { INFO, WARNING, ERROR }

@Composable
private fun NotificationMenuItem(alert: AlertData) {
    val (iconColor, backgroundColor) = when (alert.type) {
        AlertType.INFO -> Pair(
            MaterialTheme.colorScheme.primary,
            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        )
        AlertType.WARNING -> Pair(
            MaterialTheme.colorScheme.tertiary,
            MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.3f)
        )
        AlertType.ERROR -> Pair(
            MaterialTheme.colorScheme.error,
            MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
        )
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (alert.isNew) backgroundColor else Color.Transparent,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* TODO: Navigation vers détail */ }
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = iconColor.copy(alpha = 0.15f),
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = alert.icon,
                    contentDescription = null,
                    tint = iconColor,
                    modifier = Modifier.padding(8.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = alert.title,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontWeight = if (alert.isNew) FontWeight.SemiBold else FontWeight.Normal
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = alert.content,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                if (alert.isNew) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                }
                Text(
                    text = alert.timestamp,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * Section de statistiques rapides (remplace les alertes déplacées dans le menu)
 */
@Composable
private fun QuickStatsSection(
    notifications: List<Notification>,
    absences: List<Absence>,
    fees: List<Fee>
) {
    val unreadNotifications = notifications.count { !it.isRead }
    val pendingAbsences = absences.count { it.status == AbsenceStatus.ABSENT }
    val overdueFees = fees.count { it.status == FeeStatus.OVERDUE }

    if (unreadNotifications == 0 && pendingAbsences == 0 && overdueFees == 0) return

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 24.dp)
    ) {
        Text(
            text = "Résumé",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (unreadNotifications > 0) {
                QuickStatCard(
                    icon = Icons.Rounded.Notifications,
                    count = unreadNotifications,
                    label = "Notifications",
                    color = MaterialTheme.colorScheme.primary
                )
            }
            if (pendingAbsences > 0) {
                QuickStatCard(
                    icon = Icons.Rounded.EventBusy,
                    count = pendingAbsences,
                    label = "Absences",
                    color = MaterialTheme.colorScheme.tertiary
                )
            }
            if (overdueFees > 0) {
                QuickStatCard(
                    icon = Icons.Rounded.Payment,
                    count = overdueFees,
                    label = "Paiements",
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun QuickStatCard(
    icon: ImageVector,
    count: Int,
    label: String,
    color: Color
) {
    Card(
        modifier = Modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = count.toString(),
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Bottom Navigation moderne avec effet glassmorphism
 */
@Composable
private fun ModernBottomNavigation(
    selectedItem: NavItem,
    onItemSelected: (NavItem) -> Unit
) {
    val items = listOf(
        NavItemData(NavItem.HOME, "Accueil", Icons.Rounded.Home, Icons.Outlined.Home),
        NavItemData(NavItem.GRADES, "Notes", Icons.Rounded.Grade, Icons.Outlined.Grade),
        NavItemData(NavItem.ABSENCES, "Absences", Icons.Rounded.EventBusy, Icons.Outlined.EventBusy),
        NavItemData(NavItem.PAYMENTS, "Paiements", Icons.Rounded.Payment, Icons.Outlined.Payment),
        NavItemData(NavItem.MESSAGES, "Messages", Icons.Rounded.Message, Icons.Outlined.Message)
    )

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp),
        color = Color.Transparent
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
                            MaterialTheme.colorScheme.surface
                        )
                    )
                )
                .padding(horizontal = 16.dp)
                .padding(bottom = 12.dp, top = 8.dp)
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                tonalElevation = 4.dp,
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    items.forEach { item ->
                        NavItem(
                            item = item,
                            isSelected = selectedItem == item.type,
                            onClick = { onItemSelected(item.type) }
                        )
                    }
                }
            }
        }
    }
}

data class NavItemData(
    val type: NavItem,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

@Composable
private fun NavItem(
    item: NavItemData,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        AnimatedVisibility(
            visible = isSelected,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Box(
                modifier = Modifier
                    .width(24.dp)
                    .height(3.dp)
                    .background(
                        color = MaterialTheme.colorScheme.primary,
                        shape = RoundedCornerShape(2.dp)
                    )
                    .padding(bottom = 4.dp)
            )
        }

        Spacer(modifier = Modifier.height(if (isSelected) 2.dp else 5.dp))

        val iconSize by animateDpAsState(
            targetValue = if (isSelected) 28.dp else 24.dp,
            label = "icon_size"
        )

        val iconColor by animateColorAsState(
            targetValue = if (isSelected)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.onSurfaceVariant,
            label = "icon_color"
        )

        Box(
            modifier = Modifier
                .size(40.dp)
                .background(
                    color = if (isSelected)
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
                    else
                        Color.Transparent,
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                contentDescription = item.label,
                tint = iconColor,
                modifier = Modifier.size(iconSize)
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        AnimatedVisibility(
            visible = isSelected,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Text(
                text = item.label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Medium,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun ModernChildChip(
    student: Student,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val backgroundColor = if (isSelected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.surface
    }

    val contentColor = if (isSelected) {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSurface
    }

    Surface(
        onClick = onClick,
        selected = isSelected,
        shape = RoundedCornerShape(20.dp),
        color = backgroundColor,
        tonalElevation = if (isSelected) 0.dp else 2.dp,
        shadowElevation = if (isSelected) 8.dp else 2.dp,
        modifier = Modifier.height(64.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(
                        if (isSelected) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f)
                        else MaterialTheme.colorScheme.primaryContainer,
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${student.firstName.first()}${student.lastName.first()}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isSelected) MaterialTheme.colorScheme.onPrimary
                    else MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                Text(
                    text = "${student.firstName}",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = contentColor
                )
                Text(
                    text = student.className,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isSelected) contentColor.copy(alpha = 0.8f)
                    else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (isSelected) {
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Rounded.CheckCircle,
                    contentDescription = null,
                    tint = contentColor,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun ModernChildProfileCard(
    student: Student,
    average: Double,
    absencesCount: Int,
    totalDue: Double
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 8.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(24.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = Icons.Rounded.School,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(12.dp)
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = student.schoolName,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${student.className} • ${student.level}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                ModernMetricItem(
                    icon = Icons.Rounded.Grade,
                    value = String.format("%.1f", average),
                    label = "Moyenne",
                    unit = "/20",
                    color = getAverageColor(average),
                    backgroundColor = getAverageColor(average).copy(alpha = 0.1f)
                )

                ModernMetricItem(
                    icon = Icons.Rounded.EventBusy,
                    value = "$absencesCount",
                    label = "Absences",
                    unit = if (absencesCount > 1) "jours" else "jour",
                    color = if (absencesCount > 3) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurface,
                    backgroundColor = if (absencesCount > 3)
                        MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                    else MaterialTheme.colorScheme.surfaceVariant
                )

                ModernMetricItem(
                    icon = Icons.Rounded.Payment,
                    value = formatCurrencyCompact(totalDue),
                    label = "À payer",
                    unit = "GNF",
                    color = if (totalDue > 0) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.primary,
                    backgroundColor = if (totalDue > 0)
                        MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                    else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                )
            }

            if (student.mainTeacher != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Divider(color = MaterialTheme.colorScheme.outlineVariant)
                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Person,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Professeur principal: ",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = student.mainTeacher,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold
                        ),
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

@Composable
private fun ModernMetricItem(
    icon: ImageVector,
    value: String,
    label: String,
    unit: String,
    color: Color,
    backgroundColor: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(90.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = backgroundColor,
            modifier = Modifier.size(56.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = color,
                modifier = Modifier.padding(16.dp)
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            verticalAlignment = Alignment.Bottom
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = color
                )
            )
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                text = unit,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ModernPaymentBanner(
    totalDue: Double,
    onPayClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 24.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.9f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.error.copy(alpha = 0.2f),
                modifier = Modifier.size(48.dp)
            ) {
                Icon(
                    imageVector = Icons.Rounded.Warning,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(12.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Paiement en attente",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
                Text(
                    text = "Montant dû: ${formatCurrency(totalDue)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.8f)
                )
            }

            Button(
                onClick = onPayClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Payer")
            }
        }
    }
}

@Composable
private fun EmptyStateModern(
    onAddChild: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.size(120.dp)
        ) {
            Icon(
                imageVector = Icons.Rounded.Person,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(32.dp)
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Aucun enfant sélectionné",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Ajoutez un enfant pour accéder à ses informations scolaires, notes et absences.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = onAddChild,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.height(48.dp)
        ) {
            Icon(
                imageVector = Icons.Rounded.Add,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Ajouter un enfant")
        }
    }
}

// Helper functions améliorées
private fun calculateAverage(grades: List<Subject>): Double {
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

private fun getAverageColor(average: Double): Color {
    return when {
        average >= 16 -> Color(0xFF10B981) // Emerald 500
        average >= 14 -> Color(0xFF3B82F6) // Blue 500
        average >= 12 -> Color(0xFFF59E0B) // Amber 500
        average >= 10 -> Color(0xFFF97316) // Orange 500
        else -> Color(0xFFEF4444) // Red 500
    }
}

private fun formatCurrency(amount: Double): String {
    return when {
        amount >= 1_000_000_000 -> String.format("%.2f Md GNF", amount / 1_000_000_000)
        amount >= 1_000_000 -> String.format("%.1f M GNF", amount / 1_000_000)
        amount >= 1_000 -> String.format("%.0f K GNF", amount / 1_000)
        else -> "${amount.roundToInt()} GNF"
    }
}

private fun formatCurrencyCompact(amount: Double): String {
    return when {
        amount >= 1_000_000 -> String.format("%.1fM", amount / 1_000_000)
        amount >= 1_000 -> String.format("%.0fK", amount / 1_000)
        else -> "${amount.roundToInt()}"
    }
}