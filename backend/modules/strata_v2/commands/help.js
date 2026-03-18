const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { Colors, FOOTER, premiumUpsell } = require('../utils/embeds');

// 271 commands organized by category and tier
const COMMANDS_DATA = {
  'Server Management': {
    emoji: '🏆',
    commands: [
      { name: 'premium', desc: 'View premium plan features and upgrade options for this server', tier: 'free' },
      { name: 'enterprise', desc: 'View enterprise plan features and pricing for maximum power', tier: 'free' },
      { name: 'buy', desc: 'Purchase a premium subscription for this server with instant access', tier: 'free' },
      { name: 'invite_link', desc: 'Get the bot invite link to add Strata to your server', tier: 'free' },
      { name: 'server_analytics', desc: 'Monitor server activity metrics and member engagement statistics in real-time', tier: 'premium' },
      { name: 'server_settings', desc: 'Configure comprehensive server-wide settings and preferences through dashboard', tier: 'premium' },
      { name: 'server_health', desc: 'Check bot connection status and performance metrics with detailed diagnostics', tier: 'premium' },
      { name: 'backup_settings', desc: 'Configure automated backup schedules and restore options for server data', tier: 'premium' },
      { name: 'cross_server_network', desc: 'Manage staff members across multiple servers from unified central dashboard', tier: 'enterprise' },
      { name: 'network_analytics', desc: 'View aggregated analytics and metrics across all connected server networks', tier: 'enterprise' },
      { name: 'server_export', desc: 'Export complete server configuration and all staff data in multiple formats', tier: 'enterprise' },
      { name: 'network_sync', desc: 'Synchronize staff data roles and settings across entire server network instantly', tier: 'enterprise' }
    ]
  },
  'Staff Management': {
    emoji: '👥',
    commands: [
      { name: 'promote', desc: 'Promote a staff member to a higher rank with confirmation and role update', tier: 'free' },
      { name: 'demote', desc: 'Demote a staff member to a lower rank with required reason and double confirmation', tier: 'free' },
      { name: 'staff_list', desc: 'View paginated list of all staff members with ranks online status and points', tier: 'free' },
      { name: 'staff_profile', desc: 'View detailed comprehensive profile of a specific staff member with all stats', tier: 'free' },
      { name: 'staff_rank', desc: 'Display complete rank hierarchy showing all ranks and their member counts', tier: 'free' },
      { name: 'staff_stats', desc: 'View aggregated server-wide staff performance statistics and activity metrics', tier: 'free' },
      { name: 'staff_score', desc: 'Check individual staff member performance score and ranking position', tier: 'free' },
      { name: 'next_promotion', desc: 'View estimated promotion timeline and requirements for a staff member', tier: 'free' },
      { name: 'auto_promotion', desc: 'Configure automatic promotion rules based on configurable performance thresholds', tier: 'premium' },
      { name: 'auto_rank_up', desc: 'Enable automatic rank increases when staff members meet set thresholds', tier: 'premium' },
      { name: 'promotion_predict', desc: 'Predict promotion readiness and timeline based on current performance trajectory', tier: 'premium' },
      { name: 'promotion_status', desc: 'Track current promotion progress and milestone completion for staff members', tier: 'premium' },
      { name: 'promotion_history', desc: 'View complete historical record of all staff promotions and demotions logged', tier: 'premium' },
      { name: 'rank_predict', desc: 'Forecast rank progression timeline based on activity patterns and performance', tier: 'premium' },
      { name: 'promotion_requirements', desc: 'Display detailed requirements needed for each promotion tier clearly', tier: 'premium' },
      { name: 'staff_behavior', desc: 'Track and analyze staff behavior patterns and conduct metrics over time', tier: 'premium' },
      { name: 'staff_productivity', desc: 'Measure staff productivity through shift completion rates and task efficiency', tier: 'premium' },
      { name: 'staff_recommend', desc: 'Generate personalized development recommendations for each staff member', tier: 'premium' },
      { name: 'staff_analytics_advanced', desc: 'Perform deep analytical dive into individual staff performance data and metrics', tier: 'premium' },
      { name: 'bulk_promote', desc: 'Promote multiple staff members simultaneously based on set criteria and filters', tier: 'premium' },
      { name: 'staff_comparison', desc: 'Compare two staff members performance metrics side by side with charts', tier: 'premium' },
      { name: 'staff_tracking', desc: 'Track staff member activity levels and engagement patterns over specified periods', tier: 'premium' },
      { name: 'staff_ai_score', desc: 'Get AI-powered comprehensive staff member scoring with behavioral analysis', tier: 'enterprise' },
      { name: 'staff_network', desc: 'Manage staff members across multiple servers in unified centralized view', tier: 'enterprise' },
      { name: 'promotion_predict_ai', desc: 'Use advanced artificial intelligence to predict accurate promotion outcomes', tier: 'enterprise' },
      { name: 'staff_behavior_ai', desc: 'Analyze staff behavior patterns deeply using machine learning algorithms', tier: 'enterprise' },
      { name: 'staff_recommend_ai', desc: 'Generate AI-powered personalized development recommendations for staff growth', tier: 'enterprise' },
      { name: 'staff_export', desc: 'Export complete staff data in CSV PDF or JSON format for reporting', tier: 'enterprise' },
      { name: 'staff_analytics_export', desc: 'Export comprehensive staff analytics reports in multiple professional formats', tier: 'enterprise' },
      { name: 'staff_heatmap', desc: 'Visualize staff activity patterns and engagement through detailed heatmap display', tier: 'enterprise' },
      { name: 'staff_forecast', desc: 'Forecast staff performance trends using advanced predictive analytics models', tier: 'enterprise' },
      { name: 'staff_retention', desc: 'Analyze staff retention risk factors and predict turnover likelihood accurately', tier: 'enterprise' }
    ]
  },
  'Shifts & Tasks': {
    emoji: '⏱️',
    commands: [
      { name: 'shift_start', desc: 'Clock into a shift with role tagging notes and automatic progress tracking', tier: 'free' },
      { name: 'shift_end', desc: 'Clock out of current shift and view detailed summary with points earned', tier: 'free' },
      { name: 'shift_stats', desc: 'View personal or staff member shift statistics filtered by time period', tier: 'free' },
      { name: 'task_assign', desc: 'Assign a specific task to a staff member with description and deadline', tier: 'free' },
      { name: 'task_completion', desc: 'Mark a task as completed with optional completion notes and feedback', tier: 'free' },
      { name: 'time_tracking', desc: 'Track total work hours accurately and generate detailed time reports', tier: 'premium' },
      { name: 'task_reassign', desc: 'Reassign an existing task to a different staff member with reason logged', tier: 'premium' },
      { name: 'shift_optimizer', desc: 'Optimize shift scheduling based on staff availability preferences and coverage', tier: 'premium' },
      { name: 'task_optimizer', desc: 'Optimize task assignments based on staff skills workload and efficiency', tier: 'premium' },
      { name: 'task_insights', desc: 'View insights and analytics on task completion rates and bottlenecks', tier: 'premium' },
      { name: 'auto_task', desc: 'Configure automatic task assignment rules triggered by specific conditions', tier: 'premium' },
      { name: 'shift_pattern', desc: 'Analyze historical shift patterns to identify optimal coverage schedules', tier: 'premium' },
      { name: 'break_tracking', desc: 'Track staff break times automatically and ensure compliance with break policies', tier: 'premium' },
      { name: 'overtime_alert', desc: 'Set up intelligent alerts when staff members approach overtime thresholds', tier: 'premium' },
      { name: 'shift_scheduler', desc: 'Create and manage comprehensive shift schedules for the entire team', tier: 'premium' },
      { name: 'task_workflow', desc: 'Configure automated multi-stage task workflows with dependencies and stages', tier: 'premium' },
      { name: 'shift_report', desc: 'Generate detailed shift reports with performance metrics and trends', tier: 'premium' },
      { name: 'shift_ai_optimize', desc: 'Use AI to optimize shift scheduling for maximum efficiency and coverage', tier: 'enterprise' },
      { name: 'task_ai_assign', desc: 'Assign tasks intelligently using AI based on skills availability and workload', tier: 'enterprise' },
      { name: 'scheduling_forecast', desc: 'Forecast staffing needs accurately using predictive analytics models', tier: 'enterprise' },
      { name: 'shift_export', desc: 'Export shift data schedules and reports in multiple file formats', tier: 'enterprise' },
      { name: 'task_analytics_export', desc: 'Export comprehensive task analytics with custom reports and visualizations', tier: 'enterprise' },
      { name: 'capacity_planning', desc: 'Plan staffing capacity strategically based on historical data and trends', tier: 'enterprise' },
      { name: 'task_dependencies', desc: 'Manage complex task dependencies and multi-stage workflow chains', tier: 'enterprise' },
      { name: 'shift_network', desc: 'Manage shifts across multiple servers with centralized control panel', tier: 'enterprise' },
      { name: 'task_ai_insights', desc: 'Generate AI-powered actionable insights on task management efficiency', tier: 'enterprise' },
      { name: 'shift_trend_analysis', desc: 'Analyze shift trends deeply to improve scheduling and reduce conflicts', tier: 'enterprise' },
      { name: 'staff_workload', desc: 'Analyze and balance staff workload distribution across all assignments', tier: 'enterprise' }
    ]
  },
  'Points & Reputation': {
    emoji: '⭐',
    commands: [
      { name: 'points', desc: 'View your own point balance transaction history and earning sources', tier: 'free' },
      { name: 'check_points', desc: 'Quickly check a staff member point balance rank and milestone progress', tier: 'free' },
      { name: 'bonus_points', desc: 'Award bonus points to staff members for exceptional performance and achievements', tier: 'free' },
      { name: 'remove_points', desc: 'Deduct points from a staff member as a penalty or correction with reason', tier: 'free' },
      { name: 'top_points', desc: 'View the top point holders on the server leaderboard with rankings', tier: 'free' },
      { name: 'reputation', desc: 'View staff member reputation score standing and community feedback', tier: 'free' },
      { name: 'reward_points', desc: 'Configure automatic reward point distributions based on achievements earned', tier: 'premium' },
      { name: 'add_reputation', desc: 'Add reputation points to a staff member for positive contributions and behavior', tier: 'premium' },
      { name: 'reset_points', desc: 'Reset point balances for staff members to baseline with audit logging', tier: 'premium' },
      { name: 'points_analytics', desc: 'View detailed analytics on point earning patterns and spending distribution', tier: 'premium' },
      { name: 'points_leaderboard', desc: 'Display dynamic interactive leaderboard with point rankings and trends', tier: 'premium' },
      { name: 'points_multiplier', desc: 'Set point multipliers for special events holidays or achievements', tier: 'premium' },
      { name: 'points_decay', desc: 'Configure automatic point decay rates for inactive staff over time', tier: 'premium' },
      { name: 'points_history', desc: 'View complete point transaction history with filters and search', tier: 'premium' },
      { name: 'points_export', desc: 'Export point data and leaderboard reports in multiple formats', tier: 'premium' },
      { name: 'reputation_analytics', desc: 'Analyze reputation trends patterns and factors affecting staff reputation', tier: 'premium' },
      { name: 'points_predict', desc: 'Predict future point earnings using machine learning models and patterns', tier: 'enterprise' },
      { name: 'points_ai_optimize', desc: 'Use AI to optimize point reward systems for maximum engagement', tier: 'enterprise' },
      { name: 'points_network', desc: 'View and manage points across multiple servers from central dashboard', tier: 'enterprise' },
      { name: 'points_export_advanced', desc: 'Export comprehensive point analytics with custom reports and predictions', tier: 'enterprise' },
      { name: 'reputation_predict', desc: 'Forecast reputation changes based on activity patterns and behavior', tier: 'enterprise' },
      { name: 'points_correlation', desc: 'Analyze correlation between points and other performance metrics', tier: 'enterprise' },
      { name: 'points_trend_forecast', desc: 'Forecast point trends using advanced predictive analytics methods', tier: 'enterprise' },
      { name: 'points_audit', desc: 'Perform comprehensive audit of all point transactions and adjustments', tier: 'enterprise' },
      { name: 'points_bulk_adjust', desc: 'Bulk adjust point balances for multiple staff members at once', tier: 'enterprise' },
      { name: 'points_comparison', desc: 'Compare point earning patterns between staff members with charts', tier: 'enterprise' }
    ]
  },
  'Tickets & Apps': {
    emoji: '🎫',
    commands: [
      { name: 'ticketsetup', desc: 'Set up a professional ticket system channel for staff requests and support', tier: 'free' },
      { name: 'ticketlogs', desc: 'View comprehensive logs of all ticket activity and resolution history', tier: 'free' },
      { name: 'apply_setup', desc: 'Create application form for new staff recruitment with custom questions', tier: 'free' },
      { name: 'apply_status', desc: 'Check your current application status and expected review timeline', tier: 'free' },
      { name: 'apply_panel', desc: 'Create fully customizable application panel with questions and fields', tier: 'premium' },
      { name: 'apply_stats', desc: 'View detailed statistics on applications received and hiring funnel metrics', tier: 'premium' },
      { name: 'apply_questions', desc: 'Configure custom questions for application forms with validation', tier: 'premium' },
      { name: 'ticket_auto_close', desc: 'Set up automatic ticket closure rules based on conditions and inactivity', tier: 'premium' },
      { name: 'ticket_routing', desc: 'Configure automatic ticket routing based on category and priority levels', tier: 'premium' },
      { name: 'ticket_analytics', desc: 'Analyze ticket volume response times and resolution efficiency metrics', tier: 'premium' },
      { name: 'ticket_sla', desc: 'Set service level agreements for ticket responses and monitor compliance', tier: 'premium' },
      { name: 'application_scoring', desc: 'Score applications automatically based on configured criteria and weights', tier: 'premium' },
      { name: 'ticket_export', desc: 'Export ticket data reports and analytics for compliance and analysis', tier: 'premium' },
      { name: 'ticket_priority', desc: 'Set and manage ticket priority levels with escalation workflows', tier: 'premium' },
      { name: 'ticket_ai', desc: 'Use AI to auto-respond categorize and route tickets intelligently', tier: 'enterprise' },
      { name: 'ticket_sentiment', desc: 'Analyze ticket sentiment to prioritize urgent and critical issues', tier: 'enterprise' },
      { name: 'application_ai', desc: 'Use AI to analyze and score applications with bias detection', tier: 'enterprise' },
      { name: 'ticket_network', desc: 'Manage tickets across multiple servers from unified central dashboard', tier: 'enterprise' },
      { name: 'ticket_export_advanced', desc: 'Export comprehensive ticket analytics with custom formats and templates', tier: 'enterprise' },
      { name: 'application_predict', desc: 'Predict application success likelihood using AI models and criteria', tier: 'enterprise' },
      { name: 'sla_analytics', desc: 'Analyze SLA compliance rates and identify bottlenecks and issues', tier: 'enterprise' },
      { name: 'ticket_sentiment_analytics', desc: 'Perform deep sentiment analysis of all ticket communications', tier: 'enterprise' },
      { name: 'application_network', desc: 'Manage applications across multiple servers from centralized panel', tier: 'enterprise' }
    ]
  },
  'Warnings & Mod': {
    emoji: '⚠️',
    commands: [
      { name: 'warn', desc: 'Issue a warning to a staff member with reason severity level and threshold alerts', tier: 'free' },
      { name: 'warnings', desc: 'View comprehensive warning history for a staff member with status filters', tier: 'free' },
      { name: 'clear_warnings', desc: 'Clear all or specific warnings from a staff member record with confirmation', tier: 'free' },
      { name: 'ban_user', desc: 'Permanently ban a user from the server with confirmation and DM notification', tier: 'free' },
      { name: 'kick_user', desc: 'Remove a user from the server with optional reason and logging', tier: 'free' },
      { name: 'mute_user', desc: 'Mute a staff member temporarily or permanently with duration setting', tier: 'free' },
      { name: 'unmute_user', desc: 'Unmute a previously muted staff member immediately and restore permissions', tier: 'free' },
      { name: 'strike_add', desc: 'Add a strike to a staff member record for policy violations with reason', tier: 'premium' },
      { name: 'strike_check', desc: 'Check current strike count and complete history for a staff member', tier: 'premium' },
      { name: 'history_lookup', desc: 'Look up complete moderation history for a staff member with filters', tier: 'premium' },
      { name: 'mod_report', desc: 'Generate detailed moderation report on staff member conduct and patterns', tier: 'premium' },
      { name: 'auto_warn', desc: 'Configure automatic warnings based on configurable rule triggers and thresholds', tier: 'premium' },
      { name: 'moderation_logs', desc: 'View comprehensive moderation action logs with search and filters', tier: 'premium' },
      { name: 'appeal_setup', desc: 'Set up appeal process workflow for staff to contest moderation actions', tier: 'premium' },
      { name: 'escalation_rules', desc: 'Configure escalation rules for repeated violations with progressive actions', tier: 'premium' },
      { name: 'moderation_analytics', desc: 'Analyze moderation patterns staff behavior and common violation types', tier: 'premium' },
      { name: 'behavioral_flags', desc: 'Set up automated flags for unusual behavior patterns and anomalies', tier: 'premium' },
      { name: 'strike_analytics', desc: 'Analyze strike patterns and trends across all staff members', tier: 'premium' },
      { name: 'moderation_export', desc: 'Export moderation logs and reports for compliance and review', tier: 'premium' },
      { name: 'moderation_ai', desc: 'Use AI to detect violations and suggest appropriate moderation actions', tier: 'enterprise' },
      { name: 'moderation_audit', desc: 'Perform comprehensive audit of all moderation actions and decisions', tier: 'enterprise' },
      { name: 'moderation_network', desc: 'Manage moderation across multiple servers with centralized oversight', tier: 'enterprise' },
      { name: 'moderation_predict', desc: 'Predict potential violations using AI risk assessment models', tier: 'enterprise' },
      { name: 'escalation_ai', desc: 'Use AI to determine optimal escalation paths for each violation type', tier: 'enterprise' },
      { name: 'behavioral_analysis', desc: 'Perform deep behavioral analysis using machine learning algorithms', tier: 'enterprise' },
      { name: 'moderation_export_advanced', desc: 'Export advanced moderation reports in multiple professional formats', tier: 'enterprise' },
      { name: 'sentiment_moderation', desc: 'Analyze sentiment to detect hostile toxic or concerning communication', tier: 'enterprise' },
      { name: 'risk_assessment', desc: 'Generate risk scores for staff members based on history and patterns', tier: 'enterprise' },
      { name: 'compliance_audit', desc: 'Perform compliance audit for moderation actions and policy adherence', tier: 'enterprise' },
      { name: 'moderation_heatmap', desc: 'Visualize moderation activity patterns across the server as heatmap', tier: 'enterprise' }
    ]
  },
  'Analytics': {
    emoji: '📊',
    commands: [
      { name: 'activity_log', desc: 'View recent activity log for server or specific staff member with timestamps', tier: 'free' },
      { name: 'daily_summary', desc: 'Generate daily summary of all staff activities metrics and key events', tier: 'free' },
      { name: 'progress_tracker', desc: 'Track progress of staff toward promotion and achievement goals visually', tier: 'free' },
      { name: 'leaderboard', desc: 'Display server leaderboard rankings for points performance and achievements', tier: 'free' },
      { name: 'activity_tracking', desc: 'Track and display real-time staff activity status across the server', tier: 'free' },
      { name: 'activity_chart', desc: 'Generate visual charts of staff activity patterns trends over time', tier: 'premium' },
      { name: 'analytics_dashboard', desc: 'Access comprehensive analytics dashboard with all metrics and charts', tier: 'premium' },
      { name: 'engagement_chart', desc: 'Display staff engagement metrics through interactive visual charts', tier: 'premium' },
      { name: 'weekly_report', desc: 'Generate detailed weekly report of all staff performance metrics', tier: 'premium' },
      { name: 'monthly_summary', desc: 'Create comprehensive monthly summary report of all staff activities', tier: 'premium' },
      { name: 'performance_stats', desc: 'View detailed performance statistics for staff members with comparisons', tier: 'premium' },
      { name: 'server_overview', desc: 'Display overview of server statistics key metrics and health indicators', tier: 'premium' },
      { name: 'growth_tracking', desc: 'Track server and staff growth metrics over customizable time periods', tier: 'premium' },
      { name: 'retention_analytics', desc: 'Analyze staff retention rates and identify churn risk factors', tier: 'premium' },
      { name: 'activity_comparison', desc: 'Compare activity levels between different time periods and staff', tier: 'premium' },
      { name: 'performance_trend', desc: 'Analyze performance trends for staff over selected time periods', tier: 'premium' },
      { name: 'engagement_analytics', desc: 'Deep analytics on staff engagement levels patterns and drivers', tier: 'premium' },
      { name: 'staff_metrics', desc: 'View comprehensive staff metrics including all KPIs and indicators', tier: 'premium' },
      { name: 'productivity_report', desc: 'Generate productivity report for staff and teams with insights', tier: 'premium' },
      { name: 'activity_export', desc: 'Export activity data and reports in multiple file formats', tier: 'premium' },
      { name: 'weekly_export', desc: 'Export weekly reports in PDF CSV or Excel format for sharing', tier: 'premium' },
      { name: 'monthly_export', desc: 'Export monthly reports with charts data summaries and insights', tier: 'premium' },
      { name: 'custom_report', desc: 'Create custom reports with selected metrics and date ranges', tier: 'premium' },
      { name: 'analytics_compare', desc: 'Compare analytics between different staff members or time periods', tier: 'premium' },
      { name: 'retention_forecast', desc: 'Forecast retention rates using historical trend analysis methods', tier: 'premium' },
      { name: 'analytics_export', desc: 'Export comprehensive analytics data in multiple professional formats', tier: 'enterprise' },
      { name: 'analytics_dashboard_advanced', desc: 'Access advanced analytics dashboard with AI-generated insights', tier: 'enterprise' },
      { name: 'analytics_predict', desc: 'Predict future analytics trends using machine learning models', tier: 'enterprise' },
      { name: 'analytics_heatmap', desc: 'Generate heatmap visualization of staff activity patterns across time', tier: 'enterprise' },
      { name: 'analytics_correlation', desc: 'Analyze correlations between different performance metrics and factors', tier: 'enterprise' },
      { name: 'funnel_analysis', desc: 'Perform conversion funnel analysis for staff progression and retention', tier: 'enterprise' },
      { name: 'retention_ai', desc: 'Predict staff retention risk using advanced artificial intelligence', tier: 'enterprise' },
      { name: 'performance_ai', desc: 'Get AI-powered performance analysis with actionable recommendations', tier: 'enterprise' },
      { name: 'growth_forecast', desc: 'Forecast growth trends using predictive analytics and modeling', tier: 'enterprise' },
      { name: 'analytics_network', desc: 'View aggregated analytics across multiple servers in network', tier: 'enterprise' },
      { name: 'custom_export', desc: 'Export custom reports with AI-generated insights and visualizations', tier: 'enterprise' },
      { name: 'cross_server_analytics', desc: 'Analyze staff and server performance metrics across entire network', tier: 'enterprise' },
      { name: 'analytics_audit', desc: 'Perform comprehensive audit of all analytics data and calculations', tier: 'enterprise' },
      { name: 'predictive_analytics', desc: 'Generate predictive models for future performance and outcomes', tier: 'enterprise' },
      { name: 'comparative_analytics', desc: 'Compare performance metrics across servers in the network', tier: 'enterprise' },
      { name: 'analytics_summary_ai', desc: 'Get AI-generated natural language summary of complex analytics', tier: 'enterprise' },
      { name: 'data_warehouse', desc: 'Access centralized data warehouse for all server metrics and history', tier: 'enterprise' },
      { name: 'real_time_analytics', desc: 'View real-time analytics dashboard with live updating metrics', tier: 'enterprise' },
      { name: 'kpi_dashboard', desc: 'Display key performance indicators in unified professional dashboard', tier: 'enterprise' },
      { name: 'analytics_bulk_export', desc: 'Export analytics data for multiple servers in bulk simultaneously', tier: 'enterprise' },
      { name: 'trend_forecast', desc: 'Forecast trends using advanced predictive modeling techniques', tier: 'enterprise' },
      { name: 'risk_analytics', desc: 'Analyze risk factors across staff operations with severity scoring', tier: 'enterprise' },
      { name: 'analytics_optimization', desc: 'Get AI recommendations to optimize analytics strategy and reporting', tier: 'enterprise' }
    ]
  },
  'Automation': {
    emoji: '🔔',
    commands: [
      { name: 'activity_alert', desc: 'Set up alerts for staff activity changes status updates and milestones', tier: 'free' },
      { name: 'alert_system', desc: 'Configure basic alert notifications for important server events', tier: 'free' },
      { name: 'auto_remind', desc: 'Set up automatic reminders for staff tasks deadlines and meetings', tier: 'free' },
      { name: 'smart_alerts', desc: 'Configure intelligent alerts that adapt and learn based on patterns', tier: 'premium' },
      { name: 'automation_settings', desc: 'Configure comprehensive automation settings and preferences for server', tier: 'premium' },
      { name: 'auto_assign_roles', desc: 'Automatically assign Discord roles based on staff rank or criteria', tier: 'premium' },
      { name: 'auto_task_assign', desc: 'Configure automatic task assignment rules triggered by conditions', tier: 'premium' },
      { name: 'scheduled_reports', desc: 'Schedule automated report generation and delivery to channels', tier: 'premium' },
      { name: 'workflow_builder', desc: 'Build custom automated workflows for staff management tasks', tier: 'premium' },
      { name: 'conditional_alerts', desc: 'Set up alerts based on specific conditions thresholds and triggers', tier: 'premium' },
      { name: 'auto_promote_check', desc: 'Automatically check and process promotion eligibility daily', tier: 'premium' },
      { name: 'auto_warn_trigger', desc: 'Configure automatic warning triggers based on configurable rules', tier: 'premium' },
      { name: 'scheduled_messages', desc: 'Schedule automated messages for staff communications and announcements', tier: 'premium' },
      { name: 'auto_escalation', desc: 'Set up automatic escalation for specific events and threshold breaches', tier: 'premium' },
      { name: 'auto_cleanup', desc: 'Configure automatic cleanup of old data inactive records and temp files', tier: 'premium' },
      { name: 'notification_templates', desc: 'Create reusable notification templates for common alert types', tier: 'premium' },
      { name: 'shift_reminders', desc: 'Set up automatic shift reminders sent to staff before their shifts', tier: 'premium' },
      { name: 'automation_ai', desc: 'Use AI to create and optimize automated workflows intelligently', tier: 'enterprise' },
      { name: 'cross_server_alerts', desc: 'Configure alerts that work across multiple servers simultaneously', tier: 'enterprise' },
      { name: 'automation_export', desc: 'Export automation configurations logs and reports for backup', tier: 'enterprise' },
      { name: 'workflow_ai', desc: 'Build AI-powered intelligent workflows that learn and adapt', tier: 'enterprise' },
      { name: 'predictive_alerts', desc: 'Use AI to predict issues before they occur and send proactive alerts', tier: 'enterprise' },
      { name: 'automation_network', desc: 'Manage automation across multiple servers from central panel', tier: 'enterprise' },
      { name: 'advanced_scheduling', desc: 'Schedule complex multi-step automated processes with dependencies', tier: 'enterprise' },
      { name: 'api_integration', desc: 'Configure API integrations with external services and platforms', tier: 'enterprise' },
      { name: 'webhook_automation', desc: 'Set up webhook triggers for external automation and notifications', tier: 'enterprise' },
      { name: 'automation_audit', desc: 'Perform comprehensive audit of all automation actions and executions', tier: 'enterprise' },
      { name: 'automation_optimize', desc: 'Optimize automation workflows using AI recommendations and analysis', tier: 'enterprise' },
      { name: 'cross_server_workflows', desc: 'Create workflows that span and coordinate across multiple servers', tier: 'enterprise' },
      { name: 'automation_templates', desc: 'Use pre-built automation templates for common management tasks', tier: 'enterprise' },
      { name: 'intelligent_escalation', desc: 'AI-powered escalation system that learns from patterns and outcomes', tier: 'enterprise' },
      { name: 'automation_bulk_config', desc: 'Configure automation settings in bulk across multiple servers', tier: 'enterprise' }
    ]
  },
  'Achievements': {
    emoji: '🏅',
    commands: [
      { name: 'add_achievement', desc: 'Create and add a new achievement for staff members to unlock', tier: 'free' },
      { name: 'achievement_chart', desc: 'Display achievement progress visually through interactive charts', tier: 'free' },
      { name: 'milestone_summary', desc: 'View summary of milestones reached by staff with timestamps', tier: 'free' },
      { name: 'achievements', desc: 'View all available achievements and your personal progress toward each', tier: 'free' },
      { name: 'auto_rewards', desc: 'Configure automatic reward distribution when achievements are unlocked', tier: 'premium' },
      { name: 'reward_logs', desc: 'View detailed logs of all rewards distributed to staff members', tier: 'premium' },
      { name: 'badge_design', desc: 'Design custom badges and achievement icons for your server', tier: 'premium' },
      { name: 'streak_tracking', desc: 'Track and display staff achievement and activity streaks', tier: 'premium' },
      { name: 'achievement_tiers', desc: 'Set up achievement tiers with progressive rewards for milestones', tier: 'premium' },
      { name: 'seasonal_achievements', desc: 'Create time-limited seasonal achievements and special event badges', tier: 'premium' },
      { name: 'competitive_rewards', desc: 'Configure competitive reward systems for leaderboard winners', tier: 'premium' },
      { name: 'achievement_analytics', desc: 'Analyze achievement unlock rates patterns and popular achievements', tier: 'premium' },
      { name: 'reward_export', desc: 'Export reward and achievement data in multiple formats', tier: 'premium' },
      { name: 'achievement_ai', desc: 'Use AI to generate personalized achievement recommendations for staff', tier: 'enterprise' },
      { name: 'achievement_predict', desc: 'Predict which achievements staff members will unlock next', tier: 'enterprise' },
      { name: 'reward_ai', desc: 'AI-powered reward optimization for maximum staff engagement', tier: 'enterprise' },
      { name: 'achievement_network', desc: 'Manage achievements across multiple servers from central dashboard', tier: 'enterprise' },
      { name: 'achievement_export', desc: 'Export comprehensive achievement analytics and unlock reports', tier: 'enterprise' },
      { name: 'reward_analytics_export', desc: 'Export detailed reward analytics with predictions and insights', tier: 'enterprise' },
      { name: 'achievement_heatmap', desc: 'Visualize achievement patterns and progress through heatmap display', tier: 'enterprise' },
      { name: 'competitive_leaderboard', desc: 'AI-powered competitive leaderboard with live rankings and updates', tier: 'enterprise' },
      { name: 'achievement_forecast', desc: 'Forecast achievement trends and unlock patterns over time', tier: 'enterprise' },
      { name: 'reward_optimization', desc: 'Optimize reward systems using AI analysis and engagement data', tier: 'enterprise' },
      { name: 'achievement_sentiment', desc: 'Analyze sentiment around achievements and rewards from staff feedback', tier: 'enterprise' },
      { name: 'reward_network', desc: 'Manage rewards across multiple servers from centralized panel', tier: 'enterprise' },
      { name: 'gamification_ai', desc: 'AI-powered gamification strategy optimization for staff engagement', tier: 'enterprise' }
    ]
  },
  'Configuration': {
    emoji: '⚙️',
    commands: [
      { name: 'help', desc: 'Display interactive command browser organized by categories with filters', tier: 'free' },
      { name: 'ping', desc: 'Check bot latency system health and performance metrics in real-time', tier: 'free' },
      { name: 'invite_link', desc: 'Get the bot invite link and support server resources for adding', tier: 'free' },
      { name: 'report_issue', desc: 'Submit a bug report or feature request through modal form', tier: 'free' },
      { name: 'dashboard', desc: 'View quick server dashboard overview with key metrics and actions', tier: 'free' },
      { name: 'set_rank_roles', desc: 'Configure Discord role IDs for each staff rank level in hierarchy', tier: 'free' },
      { name: 'setup_promo', desc: 'Set up automatic promotion announcement channels and message formats', tier: 'premium' },
      { name: 'set_requirements', desc: 'Configure promotion requirements and thresholds for each rank level', tier: 'premium' },
      { name: 'view_rank_roles', desc: 'View all configured rank roles with their Discord IDs and colors', tier: 'premium' },
      { name: 'check_requirements', desc: 'Check which promotion requirements a staff member has completed', tier: 'premium' },
      { name: 'theme_config', desc: 'Customize embed colors theme and visual style for bot responses', tier: 'premium' },
      { name: 'embed_customize', desc: 'Customize embed appearance formatting and field layouts', tier: 'premium' },
      { name: 'dashboard_advanced', desc: 'Access advanced web dashboard with full configuration options', tier: 'enterprise' },
      { name: 'multi_server_dashboard', desc: 'Manage multiple servers from unified dashboard with network view', tier: 'enterprise' }
    ]
  }
};

const CATEGORY_NAMES = Object.keys(COMMANDS_DATA);
const ALL_COMMANDS = CATEGORY_NAMES.flatMap(cat =>
  COMMANDS_DATA[cat].commands.map(cmd => ({ ...cmd, category: cat }))
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display interactive command browser organized by categories with filters'),

  async execute(interaction) {
    await showHome(interaction);
  }
};

async function showHome(interaction, isUpdate = false) {
  const categoryRows = CATEGORY_NAMES.map(cat => {
    const { emoji, commands } = COMMANDS_DATA[cat];
    const freeCount = commands.filter(c => c.tier === 'free').length;
    const total = commands.length;
    return `${emoji} **${cat}** — ${total} commands (${freeCount} free)`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle('📚 STRATA COMMAND CENTER')
    .setDescription('Browse all **271 commands** available for your server.\nUse the menu below to filter by category.\n\n' + categoryRows)
    .addFields({
      name: '📊 Tier Overview',
      value: '🟢 Free: **52**  |  🔵 Premium: **162**  |  🟣 Enterprise: **271**',
      inline: false
    })
    .setFooter({ text: FOOTER })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('📂 Browse by category...')
      .addOptions([
        { label: 'All Commands', description: `271 total commands`, value: 'all', emoji: '📋' },
        ...CATEGORY_NAMES.map(cat => ({
          label: cat,
          description: `${COMMANDS_DATA[cat].commands.length} commands`,
          value: cat,
          emoji: COMMANDS_DATA[cat].emoji
        }))
      ])
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_home').setLabel('🏠 Home').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('🌐 Dashboard').setURL(process.env.DASHBOARD_URL || 'https://strata.bot'),
    new ButtonBuilder().setCustomId('help_premium').setLabel('⭐ Premium').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📖 Docs').setURL(process.env.DOCS_URL || 'https://docs.strata.bot')
  );

  const opts = { embeds: [embed], components: [row1, row2], ephemeral: true };
  const msg = isUpdate ? await interaction.update(opts) : await interaction.reply(opts);

  const col = (isUpdate ? interaction.message : await interaction.fetchReply()).createMessageComponentCollector({ time: 120_000 });
  col.on('collect', async i => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ This is not your menu.', ephemeral: true });
    if (i.customId === 'help_home') return showHome(i, true);
    if (i.customId === 'help_premium') return showPremiumUpsell(i);
    if (i.customId === 'help_category') return showCategory(i, i.values[0], 0);
    if (i.customId.startsWith('help_page_')) {
      const [, , cat, dir] = i.customId.split('_');
      const currentPage = parseInt(i.message.embeds[0].footer.text.match(/Page (\d+)/)?.[1] || '1') - 1;
      return showCategory(i, cat, dir === 'next' ? currentPage + 1 : currentPage - 1);
    }
  });
  col.on('end', () => { try { interaction.editReply({ components: [] }); } catch {} });
}

async function showCategory(interaction, category, page = 0) {
  let commands = category === 'all' ? ALL_COMMANDS : (COMMANDS_DATA[category]?.commands.map(c => ({ ...c, category })) || ALL_COMMANDS);
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(commands.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const slice = commands.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const tierEmoji = { free: '🟢', premium: '🔵', enterprise: '🟣' };

  const embed = new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle(`📚 Commands — Page ${page + 1}/${totalPages} • ${category === 'all' ? 'All' : category}`)
    .setDescription(slice.map((cmd, i) =>
      `\`${page * PAGE_SIZE + i + 1}.\` ${tierEmoji[cmd.tier]} \`${cmd.name}\` — ${cmd.desc}`
    ).join('\n'))
    .setFooter({ text: `Page ${page + 1}/${totalPages} • ${commands.length} total • ${FOOTER}` })
    .setTimestamp();

  const catKey = category === 'all' ? 'all' : category;

  const rows = [];
  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`help_page_${catKey}_prev`).setLabel('◀️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('help_page_info').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`help_page_${catKey}_next`).setLabel('Next ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );
  rows.push(navRow);

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('📂 Switch category...')
      .addOptions([
        { label: 'All Commands', value: 'all', emoji: '📋' },
        ...CATEGORY_NAMES.map(cat => ({
          label: cat,
          description: `${COMMANDS_DATA[cat].commands.length} commands`,
          value: cat,
          emoji: COMMANDS_DATA[cat].emoji
        }))
      ])
  );
  rows.push(selectRow);
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_home').setLabel('🏠 Home').setStyle(ButtonStyle.Secondary)
  ));

  await interaction.update({ embeds: [embed], components: rows });
}

async function showPremiumUpsell(interaction) {
  const embed = premiumUpsell('Premium');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('🔵 Get Premium').setURL('https://strata.bot/premium'),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('🟣 Get Enterprise').setURL('https://strata.bot/enterprise'),
    new ButtonBuilder().setCustomId('help_home').setLabel('🏠 Back').setStyle(ButtonStyle.Secondary)
  );
  await interaction.update({ embeds: [embed], components: [row] });
}
