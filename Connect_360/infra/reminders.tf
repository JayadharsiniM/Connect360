# =============================================================================
# Connect360 - Booking Reminder / Overdue Monitoring (Enhancement)
#
# A scheduled EventBridge rule invokes the existing bookings Lambda on a fixed
# cadence. The bookings Lambda recognises the event marker (source =
# "connect360.reminders") and runs reminders_handler.sweep_overdue_bookings(),
# which flags overdue bookings and sends de-duplicated worker reminders.
#
# This is the "reliable server-side mechanism" for overdue detection. No new
# Lambda is introduced — it reuses the bookings function (and its IAM role /
# DynamoDB access), staying within the free-tier, zero-extra-infra philosophy.
# =============================================================================

variable "overdue_sweep_schedule" {
  description = "EventBridge schedule expression for the overdue booking sweep."
  type        = string
  default     = "rate(15 minutes)"
}

variable "overdue_grace_minutes" {
  description = "Minutes after a booking's scheduled time before it is overdue."
  type        = string
  default     = "60"
}

variable "booking_tz_offset_minutes" {
  description = <<-EOT
    Business time-zone offset (minutes) used to interpret bookings'
    scheduled_date/scheduled_time, which are stored as the customer's local
    wall-clock time. Default 330 = IST (UTC+5:30). UTC = 0, EST = -300.
  EOT
  type        = string
  default     = "330"
}

resource "aws_cloudwatch_event_rule" "overdue_sweep" {
  name                = "${var.project_name}-overdue-sweep-${var.environment}"
  description         = "Periodically flag overdue bookings and remind workers"
  schedule_expression = var.overdue_sweep_schedule
}

resource "aws_cloudwatch_event_target" "overdue_sweep" {
  rule      = aws_cloudwatch_event_rule.overdue_sweep.name
  target_id = "bookings-overdue-sweep"
  arn       = aws_lambda_function.bookings.arn

  # Marker payload the bookings handler checks before any HTTP routing.
  input = jsonencode({
    source = "connect360.reminders"
    task   = "sweep_overdue_bookings"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_overdue" {
  statement_id  = "AllowEventBridgeOverdueSweep"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bookings.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.overdue_sweep.arn
}
