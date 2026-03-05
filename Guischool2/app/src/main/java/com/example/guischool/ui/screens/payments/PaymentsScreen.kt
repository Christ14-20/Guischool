package com.example.guischool.ui.screens.payments

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.guischool.data.model.*
import com.example.guischool.ui.PaymentState
import kotlin.math.roundToInt

// Palette de couleurs sophistiquée et cohérente
private val SuccessGreen = Color(0xFF10B981)
private val WarningAmber = Color(0xFFF59E0B)
private val ErrorRed = Color(0xFFEF4444)
private val InfoBlue = Color(0xFF3B82F6)
private val PurpleAccent = Color(0xFF8B5CF6)

/**
 * Écran de paiements avec design épuré et moderne
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentsScreen(
    student: Student?,
    fees: List<Fee>,
    payments: List<Payment>,
    paymentState: PaymentState,
    onBackClick: () -> Unit,
    onInitiatePayment: (Double, PaymentMethod) -> Unit,
    onConfirmPayment: (String) -> Unit,
    onCancelPayment: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showPaymentDialog by remember { mutableStateOf(false) }
    var selectedFee by remember { mutableStateOf<Fee?>(null) }
    var customAmount by remember { mutableStateOf("") }
    var selectedMethod by remember { mutableStateOf(PaymentMethod.ORANGE_MONEY) }

    val totalDue = fees.filter { !it.isPaid }.sumOf { it.remainingAmount }
    val totalPaid = payments.sumOf { it.amount }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp
            ) {
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            "Paiements",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = onBackClick) {
                            Icon(
                                Icons.Default.ArrowBack,
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
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        if (student == null) {
            EmptyState(
                icon = Icons.Outlined.PersonOff,
                title = "Aucun élève sélectionné",
                subtitle = "Veuillez sélectionner un élève pour voir les paiements",
                modifier = Modifier.padding(paddingValues)
            )
            return@Scaffold
        }

        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Carte résumé élégante
            item {
                PaymentSummaryCardV2(
                    totalDue = totalDue,
                    totalPaid = totalPaid,
                    studentName = "${student.firstName} ${student.lastName}",
                    pendingCount = fees.count { it.status == FeeStatus.PENDING || it.status == FeeStatus.OVERDUE }
                )
            }

            // Onglets modernisés
            item {
                ModernTabRow(
                    selectedTab = selectedTab,
                    onTabSelected = { selectedTab = it },
                    tabs = listOf(
                        TabItem("Frais", Icons.Outlined.ReceiptLong, fees.count { !it.isPaid }),
                        TabItem("Historique", Icons.Outlined.History, payments.size)
                    )
                )
            }

            when (selectedTab) {
                0 -> {
                    if (fees.isEmpty()) {
                        item {
                            EmptyState(
                                icon = Icons.Outlined.CheckCircle,
                                title = "Tous les frais sont payés",
                                subtitle = "Aucun frais en attente de paiement"
                            )
                        }
                    } else {
                        items(fees, key = { it.id }) { fee ->
                            AnimatedVisibility(
                                visible = true,
                                enter = fadeIn() + slideInVertically(initialOffsetY = { it / 2 })
                            ) {
                                FeeCardV2(
                                    fee = fee,
                                    onPayClick = {
                                        selectedFee = fee
                                        customAmount = fee.remainingAmount.toLong().toString()
                                        showPaymentDialog = true
                                    }
                                )
                            }
                        }

                        if (fees.any { !it.isPaid }) {
                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                FilledTonalButton(
                                    onClick = {
                                        selectedFee = null
                                        customAmount = totalDue.toLong().toString()
                                        showPaymentDialog = true
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(56.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = ButtonDefaults.filledTonalButtonColors(
                                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                ) {
                                    Icon(
                                        Icons.Outlined.Payments,
                                        contentDescription = null,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "Régler tout (${formatCurrency(totalDue)})",
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }
                1 -> {
                    if (payments.isEmpty()) {
                        item {
                            EmptyState(
                                icon = Icons.Outlined.Receipt,
                                title = "Aucun paiement",
                                subtitle = "L'historique des paiements apparaîtra ici"
                            )
                        }
                    } else {
                        items(payments, key = { it.id }) { payment ->
                            PaymentHistoryCardV2(payment = payment)
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }

    if (showPaymentDialog) {
        PaymentDialogV2(
            student = student,
            fee = selectedFee,
            amount = customAmount,
            selectedMethod = selectedMethod,
            paymentState = paymentState,
            onAmountChange = { customAmount = it },
            onMethodChange = { selectedMethod = it },
            onPayClick = {
                val amount = customAmount.toDoubleOrNull() ?: 0.0
                onInitiatePayment(amount, selectedMethod)
            },
            onConfirmPayment = { ref ->
                onConfirmPayment(ref)
                showPaymentDialog = false
            },
            onCancel = {
                onCancelPayment()
                showPaymentDialog = false
            },
            onDismiss = { showPaymentDialog = false }
        )
    }
}

data class TabItem(
    val label: String,
    val icon: ImageVector,
    val badge: Int = 0
)

@Composable
fun ModernTabRow(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
    tabs: List<TabItem>
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            tabs.forEachIndexed { index, tab ->
                val selected = selectedTab == index
                val interactionSource = remember { MutableInteractionSource() }

                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    shape = RoundedCornerShape(12.dp),
                    color = if (selected) MaterialTheme.colorScheme.surface else Color.Transparent,
                    tonalElevation = if (selected) 2.dp else 0.dp,
                    onClick = { onTabSelected(index) },
                    interactionSource = interactionSource
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            tab.icon,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = if (selected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            tab.label,
                            style = MaterialTheme.typography.labelLarge,
                            color = if (selected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium
                        )
                        if (tab.badge > 0) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = CircleShape,
                                color = if (selected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                                modifier = Modifier.size(20.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        tab.badge.toString(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (selected) MaterialTheme.colorScheme.onPrimary
                                        else MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PaymentSummaryCardV2(
    totalDue: Double,
    totalPaid: Double,
    studentName: String,
    pendingCount: Int
) {
    val isPaid = totalDue <= 0

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPaid) SuccessGreen.copy(alpha = 0.1f)
            else MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isPaid) 0.dp else 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            // En-tête avec nom de l'élève
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = CircleShape,
                        color = if (isPaid) SuccessGreen.copy(alpha = 0.2f)
                        else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                        modifier = Modifier.size(40.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Outlined.School,
                                contentDescription = null,
                                tint = if (isPaid) SuccessGreen else MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = studentName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = if (isPaid) "Solde à jour" else "$pendingCount frais en attente",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isPaid) SuccessGreen else WarningAmber
                        )
                    }
                }

                if (isPaid) {
                    Icon(
                        imageVector = Icons.Outlined.Verified,
                        contentDescription = null,
                        tint = SuccessGreen,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            Spacer(modifier = Modifier.height(20.dp))

            // Montants
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Reste à payer",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = formatCurrency(totalDue),
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (isPaid) SuccessGreen else MaterialTheme.colorScheme.onSurface
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Total payé",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = formatCurrency(totalPaid),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            if (!isPaid && totalPaid > 0) {
                Spacer(modifier = Modifier.height(16.dp))
                LinearProgressIndicator(
                    progress = { (totalPaid / (totalDue + totalPaid)).toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }
        }
    }
}

@Composable
fun FeeCardV2(
    fee: Fee,
    onPayClick: () -> Unit
) {
    val statusColors = when (fee.status) {
        FeeStatus.PAID -> StatusColors(SuccessGreen, SuccessGreen.copy(alpha = 0.1f), Icons.Outlined.CheckCircle)
        FeeStatus.PENDING -> StatusColors(WarningAmber, WarningAmber.copy(alpha = 0.1f), Icons.Outlined.Schedule)
        FeeStatus.OVERDUE -> StatusColors(ErrorRed, ErrorRed.copy(alpha = 0.1f), Icons.Outlined.Warning)
        FeeStatus.PARTIALLY_PAID -> StatusColors(InfoBlue, InfoBlue.copy(alpha = 0.1f), Icons.Outlined.TrendingUp)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Indicateur de statut
                Surface(
                    shape = CircleShape,
                    color = statusColors.bgColor,
                    modifier = Modifier.size(44.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = statusColors.icon,
                            contentDescription = null,
                            tint = statusColors.color,
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = fee.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = fee.category,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    if (fee.dueDate != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Outlined.Event,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = if (fee.status == FeeStatus.OVERDUE) ErrorRed
                                else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Échéance: ${fee.dueDate}",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (fee.status == FeeStatus.OVERDUE) ErrorRed
                                else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                if (fee.status != FeeStatus.PAID) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = formatCurrency(fee.remainingAmount),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "sur ${formatCurrency(fee.totalAmount)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    Icon(
                        imageVector = Icons.Outlined.CheckCircle,
                        contentDescription = null,
                        tint = SuccessGreen,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            if (fee.status != FeeStatus.PAID) {
                Spacer(modifier = Modifier.height(12.dp))

                // Barre de progression
                val progress = (fee.paidAmount / fee.totalAmount).toFloat().coerceIn(0f, 1f)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .weight(1f)
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = statusColors.color,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )

                    Spacer(modifier = Modifier.width(12.dp))

                    Text(
                        text = "${(progress * 100).roundToInt()}%",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedButton(
                    onClick = onPayClick,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        width = 1.5.dp,
                        brush = Brush.horizontalGradient(
                            colors = listOf(statusColors.color, statusColors.color.copy(alpha = 0.7f))
                        )
                    ),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = statusColors.color
                    )
                ) {
                    Icon(
                        Icons.Outlined.Payment,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        if (fee.status == FeeStatus.PARTIALLY_PAID) "Compléter" else "Payer",
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

data class StatusColors(
    val color: Color,
    val bgColor: Color,
    val icon: ImageVector
)

@Composable
fun PaymentHistoryCardV2(payment: Payment) {
    val methodConfig = remember(payment.method) {
        when (payment.method) {
            PaymentMethod.ORANGE_MONEY -> MethodConfig(Color(0xFFFF6600), "Orange Money", Icons.Outlined.Smartphone)
            PaymentMethod.MTN_MONEY -> MethodConfig(Color(0xFFFFC107), "MTN MoMo", Icons.Outlined.PhoneAndroid)
            PaymentMethod.WAVE -> MethodConfig(Color(0xFF5C6BC0), "Wave", Icons.Outlined.Waves)
            PaymentMethod.CASH -> MethodConfig(SuccessGreen, "Espèces", Icons.Outlined.Payments)
            else -> MethodConfig(Color(0xFF3B82F6), payment.method.name, Icons.Outlined.AccountBalance)
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icône méthode de paiement
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = methodConfig.color.copy(alpha = 0.1f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = methodConfig.icon,
                        contentDescription = null,
                        tint = methodConfig.color,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = payment.category,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(2.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Outlined.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = payment.paymentDate,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                if (payment.reference != null) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Ref: ${payment.reference}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = formatCurrency(payment.amount),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SuccessGreen
                )

                Spacer(modifier = Modifier.height(4.dp))

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = methodConfig.color.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = methodConfig.label,
                        style = MaterialTheme.typography.labelSmall,
                        color = methodConfig.color,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}

data class MethodConfig(
    val color: Color,
    val label: String,
    val icon: ImageVector
)

@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.size(80.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        modifier = Modifier.size(40.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun PaymentDialogV2(
    student: Student?,
    fee: Fee?,
    amount: String,
    selectedMethod: PaymentMethod,
    paymentState: PaymentState,
    onAmountChange: (String) -> Unit,
    onMethodChange: (PaymentMethod) -> Unit,
    onPayClick: () -> Unit,
    onConfirmPayment: (String) -> Unit,
    onCancel: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = { if (paymentState !is PaymentState.Processing) onDismiss() },
        shape = RoundedCornerShape(28.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        title = {
            Text(
                "Nouveau paiement",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold
            )
        },
        text = {
            Column {
                // Info élève
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    ),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                            modifier = Modifier.size(40.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = (student?.firstName?.firstOrNull() ?: '?').toString(),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = "${student?.firstName ?: "Inconnu"} ${student?.lastName ?: ""}",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = student?.className ?: "Classe inconnue",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Champ montant
                Text(
                    text = "Montant",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = amount,
                    onValueChange = { newValue ->
                        if (newValue.all { it.isDigit() }) {
                            onAmountChange(newValue)
                        }
                    },
                    label = { Text("Montant en GNF") },
                    leadingIcon = {
                        Text(
                            "GNF",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    enabled = fee == null && paymentState is PaymentState.Idle,
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                    )
                )

                if (fee != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Pour: ${fee.name}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Méthodes de paiement
                Text(
                    text = "Méthode de paiement",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(8.dp))

                PaymentMethodGrid(
                    selectedMethod = selectedMethod,
                    onMethodSelected = onMethodChange,
                    enabled = paymentState is PaymentState.Idle
                )

                // État du paiement
                when (paymentState) {
                    is PaymentState.Processing -> {
                        Spacer(modifier = Modifier.height(20.dp))
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(20.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    "Traitement en cours...",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                    is PaymentState.AwaitingConfirmation -> {
                        Spacer(modifier = Modifier.height(20.dp))
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = InfoBlue.copy(alpha = 0.1f)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(20.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Outlined.MarkEmailRead,
                                        contentDescription = null,
                                        tint = InfoBlue
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "Confirmation requise",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = InfoBlue
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    "Un code vous a été envoyé. Veuillez valider sur votre téléphone.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                Button(
                                    onClick = { onConfirmPayment(paymentState.transactionRef) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = InfoBlue)
                                ) {
                                    Text("J'ai confirmé")
                                }
                            }
                        }
                    }
                    is PaymentState.Success -> {
                        Spacer(modifier = Modifier.height(20.dp))
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = SuccessGreen.copy(alpha = 0.1f)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(20.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = SuccessGreen,
                                    modifier = Modifier.size(40.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Outlined.Check,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column {
                                    Text(
                                        "Paiement réussi !",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                        color = SuccessGreen
                                    )
                                    Text(
                                        "Transaction complétée",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                    is PaymentState.Error -> {
                        Spacer(modifier = Modifier.height(20.dp))
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = ErrorRed.copy(alpha = 0.1f)
                            ),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.ErrorOutline,
                                    contentDescription = null,
                                    tint = ErrorRed
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    paymentState.message,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = ErrorRed
                                )
                            }
                        }
                    }
                    else -> {}
                }
            }
        },
        confirmButton = {
            if (paymentState is PaymentState.Idle || paymentState is PaymentState.Error) {
                Button(
                    onClick = onPayClick,
                    enabled = amount.toDoubleOrNull()?.let { it > 0 } ?: false,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.height(44.dp)
                ) {
                    Icon(Icons.Outlined.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Payer maintenant")
                }
            }
        },
        dismissButton = {
            if (paymentState is PaymentState.Idle || paymentState is PaymentState.Error) {
                TextButton(
                    onClick = onDismiss,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Annuler")
                }
            }
        }
    )
}

@Composable
fun PaymentMethodGrid(
    selectedMethod: PaymentMethod,
    onMethodSelected: (PaymentMethod) -> Unit,
    enabled: Boolean
) {
    val methods = listOf(
        PaymentMethod.ORANGE_MONEY to MethodInfo("Orange", Color(0xFFFF6600), Icons.Outlined.Smartphone),
        PaymentMethod.MTN_MONEY to MethodInfo("MTN", Color(0xFFFFC107), Icons.Outlined.PhoneAndroid),
        PaymentMethod.WAVE to MethodInfo("Wave", Color(0xFF5C6BC0), Icons.Outlined.Waves),
        PaymentMethod.CASH to MethodInfo("Espèces", SuccessGreen, Icons.Outlined.Payments)
    )

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        methods.chunked(2).forEach { rowMethods ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rowMethods.forEach { (method, info) ->
                    val selected = selectedMethod == method

                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .height(64.dp),
                        shape = RoundedCornerShape(16.dp),
                        color = when {
                            !enabled -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                            selected -> info.color.copy(alpha = 0.15f)
                            else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                        },
                        onClick = { if (enabled) onMethodSelected(method) },
                        enabled = enabled
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = if (selected) info.color else info.color.copy(alpha = 0.2f),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = info.icon,
                                        contentDescription = null,
                                        tint = if (selected) Color.White else info.color,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(10.dp))

                            Text(
                                text = info.label,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                                color = if (selected) info.color else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }
    }
}

data class MethodInfo(
    val label: String,
    val color: Color,
    val icon: ImageVector
)

// Fonctions utilitaires
private fun formatCurrency(amount: Double): String {
    return when {
        amount >= 1_000_000 -> String.format("%,.1fM GNF", amount / 1_000_000)
        amount >= 1_000 -> String.format("%,.0fK GNF", amount / 1_000)
        else -> "%,.0f GNF".format(amount)
    }
}